export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "../../../lib/db";

/*
|--------------------------------------------------------------------------
| TIPOS
|--------------------------------------------------------------------------
*/

type ItemVenda = {
  id?: number;
  nome: string;
  preco: string | number;
  cartQtd: number;
  qtd?: number;
};

type Venda = {
  id: number;
  itens: string;
  total: number | string;
  pagamento: string;
  descricao: string | null;
  created_at: string;
};

type ProdutoResumo = {
  qtd: number;
  total: number;
};

type PagamentoResumo = {
  total: number;
  produtos: Record<string, ProdutoResumo>;
};

type DescricaoResumo = {
  nome: string;
  total: number;
  produtos: Record<string, ProdutoResumo>;
};

type FechamentoResumo = {
  fechamentoGeral: {
    total: number;
    quantidadeVendas: number;
    quantidadeItens: number;
  };

  porPagamento: Record<
    string,
    PagamentoResumo
  >;

  porDescricao: DescricaoResumo[];

  semDescricao: DescricaoResumo;

  produtos: Record<string, ProdutoResumo>;
};

/*
|--------------------------------------------------------------------------
| CRIAR TABELAS
|--------------------------------------------------------------------------
*/

async function criarTabelas() {
  await initDB();

  /*
  |--------------------------------------------------------------------------
  | FECHAMENTOS
  |--------------------------------------------------------------------------
  */

  await db.execute(`
    CREATE TABLE IF NOT EXISTS fechamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      numero INTEGER NOT NULL UNIQUE,

      created_at TEXT NOT NULL,

      total REAL NOT NULL DEFAULT 0,

      quantidade_vendas INTEGER NOT NULL DEFAULT 0,

      quantidade_itens INTEGER NOT NULL DEFAULT 0,

      venda_ids TEXT NOT NULL DEFAULT '[]',

      resumo TEXT NOT NULL DEFAULT '{}'
    )
  `);

  /*
  |--------------------------------------------------------------------------
  | LOG / HISTÓRICO DE VENDAS
  |--------------------------------------------------------------------------
  |
  | Quando um fechamento é realizado:
  |
  | vendas -> vendas_log
  |
  | Depois a venda é removida da tabela vendas.
  |
  | Assim o Log continua mostrando tudo.
  |
  */

  await db.execute(`
    CREATE TABLE IF NOT EXISTS vendas_log (
      id INTEGER PRIMARY KEY,

      itens TEXT NOT NULL DEFAULT '[]',

      total REAL NOT NULL DEFAULT 0,

      pagamento TEXT NOT NULL DEFAULT 'outro',

      descricao TEXT NOT NULL DEFAULT '',

      created_at TEXT NOT NULL,

      fechamento_id INTEGER
    )
  `);
}

/*
|--------------------------------------------------------------------------
| NORMALIZAR DESCRIÇÃO
|--------------------------------------------------------------------------
|
| Eduardo
| eduardo
| EDUARDO
|  Eduardo
| eDuArDo
|
| todos viram:
|
| eduardo
|
|--------------------------------------------------------------------------
*/

function normalizarDescricao(
  descricao: string | null | undefined
) {
  return String(descricao || "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

/*
|--------------------------------------------------------------------------
| PARSE DOS ITENS
|--------------------------------------------------------------------------
*/

function obterItens(
  itensTexto: string
): ItemVenda[] {
  try {
    const itens = JSON.parse(itensTexto);

    if (!Array.isArray(itens)) {
      return [];
    }

    return itens;
  } catch {
    return [];
  }
}

/*
|--------------------------------------------------------------------------
| MONTAR RESUMO
|--------------------------------------------------------------------------
*/

function montarResumo(
  vendas: Venda[]
): FechamentoResumo {
  const produtos: Record<
    string,
    ProdutoResumo
  > = {};

  const porPagamento: Record<
    string,
    PagamentoResumo
  > = {};

  const porDescricaoMap: Record<
    string,
    DescricaoResumo
  > = {};

  const semDescricao: DescricaoResumo = {
    nome: "Sem descrição",
    total: 0,
    produtos: {},
  };

  let totalGeral = 0;
  let quantidadeItens = 0;

  /*
  |--------------------------------------------------------------------------
  | VENDAS
  |--------------------------------------------------------------------------
  */

  for (const venda of vendas) {
    const valorVenda =
      Number(venda.total) || 0;

    totalGeral += valorVenda;

    /*
    |--------------------------------------------------------------------------
    | PAGAMENTO
    |--------------------------------------------------------------------------
    */

    const pagamento =
      String(
        venda.pagamento || "outro"
      )
        .trim()
        .toLowerCase();

    if (!porPagamento[pagamento]) {
      porPagamento[pagamento] = {
        total: 0,
        produtos: {},
      };
    }

    porPagamento[pagamento].total +=
      valorVenda;

    /*
    |--------------------------------------------------------------------------
    | DESCRIÇÃO
    |--------------------------------------------------------------------------
    */

    const descricaoOriginal =
      String(venda.descricao || "").trim();

    const descricaoNormalizada =
      normalizarDescricao(
        venda.descricao
      );

    let grupoDescricao:
      | DescricaoResumo
      | null = null;

    if (descricaoNormalizada) {
      if (
        !porDescricaoMap[
          descricaoNormalizada
        ]
      ) {
        porDescricaoMap[
          descricaoNormalizada
        ] = {
          /*
          | Mantém a primeira forma digitada.
          */

          nome: descricaoOriginal,

          total: 0,

          produtos: {},
        };
      }

      grupoDescricao =
        porDescricaoMap[
          descricaoNormalizada
        ];

      grupoDescricao.total +=
        valorVenda;
    } else {
      grupoDescricao = semDescricao;

      semDescricao.total +=
        valorVenda;
    }

    /*
    |--------------------------------------------------------------------------
    | PRODUTOS
    |--------------------------------------------------------------------------
    */

    const itens = obterItens(
      venda.itens
    );

    for (const item of itens) {
      const nome =
        String(item.nome || "").trim();

      if (!nome) {
        continue;
      }

      const qtd =
        Number(
          item.cartQtd ??
            item.qtd ??
            0
        ) || 0;

      const preco =
        Number(item.preco) || 0;

      const totalProduto =
        preco * qtd;

      quantidadeItens += qtd;

      /*
      |--------------------------------------------------------------------------
      | GERAL
      |--------------------------------------------------------------------------
      */

      if (!produtos[nome]) {
        produtos[nome] = {
          qtd: 0,
          total: 0,
        };
      }

      produtos[nome].qtd += qtd;

      produtos[nome].total +=
        totalProduto;

      /*
      |--------------------------------------------------------------------------
      | POR PAGAMENTO
      |--------------------------------------------------------------------------
      */

      if (
        !porPagamento[pagamento]
          .produtos[nome]
      ) {
        porPagamento[
          pagamento
        ].produtos[nome] = {
          qtd: 0,
          total: 0,
        };
      }

      porPagamento[
        pagamento
      ].produtos[nome].qtd += qtd;

      porPagamento[
        pagamento
      ].produtos[nome].total +=
        totalProduto;

      /*
      |--------------------------------------------------------------------------
      | POR DESCRIÇÃO
      |--------------------------------------------------------------------------
      */

      if (
        !grupoDescricao.produtos[
          nome
        ]
      ) {
        grupoDescricao.produtos[
          nome
        ] = {
          qtd: 0,
          total: 0,
        };
      }

      grupoDescricao.produtos[
        nome
      ].qtd += qtd;

      grupoDescricao.produtos[
        nome
      ].total += totalProduto;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | ORDENAR DESCRIÇÕES
  |--------------------------------------------------------------------------
  */

  const porDescricao =
    Object.values(
      porDescricaoMap
    ).sort((a, b) =>
      a.nome.localeCompare(
        b.nome,
        "pt-BR",
        {
          sensitivity: "base",
        }
      )
    );

  return {
    fechamentoGeral: {
      total: totalGeral,

      quantidadeVendas:
        vendas.length,

      quantidadeItens,
    },

    porPagamento,

    porDescricao,

    semDescricao,

    produtos,
  };
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| GET /api/fechamentos
|
| Lista os fechamentos realizados.
|
|--------------------------------------------------------------------------
*/

export async function GET(
  request: NextRequest
) {
  try {
    await criarTabelas();

    const { searchParams } =
      new URL(request.url);

    const id =
      searchParams.get("id");

    /*
    |--------------------------------------------------------------------------
    | BUSCAR UM FECHAMENTO
    |--------------------------------------------------------------------------
    */

    if (id) {
      const result =
        await db.execute({
          sql: `
            SELECT *
            FROM fechamentos
            WHERE id = ?
            LIMIT 1
          `,
          args: [Number(id)],
        });

      if (
        result.rows.length === 0
      ) {
        return NextResponse.json(
          {
            error:
              "Fechamento não encontrado.",
          },
          {
            status: 404,
          }
        );
      }

      const row =
        result.rows[0];

      let resumo: any = {};

      try {
        resumo = JSON.parse(
          String(
            row.resumo || "{}"
          )
        );
      } catch {
        resumo = {};
      }

      let vendaIds: number[] = [];

      try {
        const parsed =
          JSON.parse(
            String(
              row.venda_ids ||
                "[]"
            )
          );

        if (Array.isArray(parsed)) {
          vendaIds = parsed.map(
            Number
          );
        }
      } catch {
        vendaIds = [];
      }

      return NextResponse.json({
        id: Number(row.id),

        numero: Number(
          row.numero
        ),

        created_at:
          String(
            row.created_at
          ),

        total: Number(
          row.total || 0
        ),

        quantidade_vendas:
          Number(
            row.quantidade_vendas ||
              0
          ),

        quantidade_itens:
          Number(
            row.quantidade_itens ||
              0
          ),

        venda_ids:
          vendaIds,

        resumo,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | LISTAR TODOS OS FECHAMENTOS
    |--------------------------------------------------------------------------
    */

    const result =
      await db.execute(`
        SELECT
          id,
          numero,
          created_at,
          total,
          quantidade_vendas,
          quantidade_itens
        FROM fechamentos
        ORDER BY numero DESC
      `);

    const fechamentos =
      result.rows.map(
        (row) => ({
          id: Number(row.id),

          numero: Number(
            row.numero
          ),

          created_at:
            String(
              row.created_at
            ),

          total: Number(
            row.total || 0
          ),

          quantidade_vendas:
            Number(
              row.quantidade_vendas ||
                0
            ),

          quantidade_itens:
            Number(
              row.quantidade_itens ||
                0
            ),
        })
      );

    return NextResponse.json(
      fechamentos
    );
  } catch (error: any) {
    console.error(
      "GET /api/fechamentos:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro ao buscar fechamentos.",

        details:
          error?.message,
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST — FAZER FECHAMENTO
|--------------------------------------------------------------------------
|
| POST /api/fechamentos
|
| FLUXO:
|
| 1. Pega as vendas atuais.
|
| 2. Gera o resumo.
|
| 3. Cria o fechamento.
|
| 4. Copia as vendas para vendas_log.
|
| 5. APAGA as vendas atuais.
|
| 6. Próxima venda começa um novo ciclo.
|
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest
) {
  try {
    await criarTabelas();

    /*
    |--------------------------------------------------------------------------
    | PEGAR VENDAS ATUAIS
    |--------------------------------------------------------------------------
    */

    const vendasResult =
      await db.execute(`
        SELECT
          id,
          itens,
          total,
          pagamento,
          descricao,
          created_at
        FROM vendas
        ORDER BY id ASC
      `);

    const vendas: Venda[] =
      vendasResult.rows.map(
        (row) =>
          ({
            id: Number(row.id),

            itens: String(
              row.itens || "[]"
            ),

            total: Number(
              row.total || 0
            ),

            pagamento: String(
              row.pagamento ||
                "outro"
            ),

            descricao:
              row.descricao
                ? String(
                    row.descricao
                  )
                : "",

            created_at:
              String(
                row.created_at ||
                  new Date().toISOString()
              ),
          }) as Venda
      );

    /*
    |--------------------------------------------------------------------------
    | NÃO HÁ VENDAS
    |--------------------------------------------------------------------------
    */

    if (vendas.length === 0) {
      return NextResponse.json(
        {
          error:
            "Não existem vendas para fazer o fechamento.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | MONTAR RESUMO
    |--------------------------------------------------------------------------
    */

    const resumo =
      montarResumo(vendas);

    /*
    |--------------------------------------------------------------------------
    | PRÓXIMO NÚMERO
    |--------------------------------------------------------------------------
    */

    const numeroResult =
      await db.execute(`
        SELECT
          COALESCE(
            MAX(numero),
            0
          ) + 1 AS proximo
        FROM fechamentos
      `);

    const numero =
      Number(
        numeroResult.rows[0]
          ?.proximo || 1
      );

    /*
    |--------------------------------------------------------------------------
    | DATA/HORA
    |--------------------------------------------------------------------------
    */

    const createdAt =
      new Date().toISOString();

    /*
    |--------------------------------------------------------------------------
    | IDS
    |--------------------------------------------------------------------------
    */

    const vendaIds =
      vendas.map(
        (v) => v.id
      );

    /*
    |--------------------------------------------------------------------------
    | SALVAR FECHAMENTO
    |--------------------------------------------------------------------------
    */

    const fechamentoInsert =
      await db.execute({
        sql: `
          INSERT INTO fechamentos (
            numero,
            created_at,
            total,
            quantidade_vendas,
            quantidade_itens,
            venda_ids,
            resumo
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,

        args: [
          numero,

          createdAt,

          resumo.fechamentoGeral
            .total,

          resumo.fechamentoGeral
            .quantidadeVendas,

          resumo.fechamentoGeral
            .quantidadeItens,

          JSON.stringify(
            vendaIds
          ),

          JSON.stringify(
            resumo
          ),
        ],
      });

    const fechamentoId =
      Number(
        fechamentoInsert
          .lastInsertRowid
      );

    /*
    |--------------------------------------------------------------------------
    | COPIAR VENDAS PARA O LOG
    |--------------------------------------------------------------------------
    |
    | Antes de apagar da tabela vendas,
    | guardamos uma cópia permanente.
    |
    |--------------------------------------------------------------------------
    */

    for (const venda of vendas) {
      /*
      | Evita duplicação no log caso,
      | por algum motivo, a operação seja
      | executada novamente.
      */

      const existe =
        await db.execute({
          sql: `
            SELECT id
            FROM vendas_log
            WHERE id = ?
            LIMIT 1
          `,
          args: [venda.id],
        });

      if (
        existe.rows.length === 0
      ) {
        await db.execute({
          sql: `
            INSERT INTO vendas_log (
              id,
              itens,
              total,
              pagamento,
              descricao,
              created_at,
              fechamento_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,

          args: [
            venda.id,

            venda.itens,

            Number(venda.total) || 0,

            venda.pagamento ||
              "outro",

            venda.descricao || "",

            venda.created_at,

            fechamentoId,
          ],
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | AGORA APAGA AS VENDAS ATUAIS
    |--------------------------------------------------------------------------
    |
    | IMPORTANTE:
    |
    | NÃO mexemos em produtos.
    |
    | O estoque continua descontado.
    |
    | Estamos apenas encerrando o ciclo
    | dessas vendas.
    |
    |--------------------------------------------------------------------------
    */

    await db.execute(`
      DELETE FROM vendas
    `);

    /*
    |--------------------------------------------------------------------------
    | RESPOSTA
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: true,

        message:
          "Fechamento realizado. As vendas foram arquivadas no log e removidas do ciclo atual.",

        fechamento: {
          id: fechamentoId,

          numero,

          created_at:
            createdAt,

          total:
            resumo
              .fechamentoGeral
              .total,

          quantidade_vendas:
            resumo
              .fechamentoGeral
              .quantidadeVendas,

          quantidade_itens:
            resumo
              .fechamentoGeral
              .quantidadeItens,

          venda_ids:
            vendaIds,

          resumo,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "POST /api/fechamentos:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro ao realizar fechamento.",

        details:
          error?.message,
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| DELETE FECHAMENTO
|--------------------------------------------------------------------------
|
| DELETE /api/fechamentos?id=1
|
| Apaga somente o fechamento.
|
| NÃO apaga o log das vendas.
|
| NÃO altera estoque.
|
|--------------------------------------------------------------------------
*/

export async function DELETE(
  request: NextRequest
) {
  try {
    await criarTabelas();

    const { searchParams } =
      new URL(request.url);

    const id =
      searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Informe o ID do fechamento.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await db.execute({
        sql: `
          DELETE FROM fechamentos
          WHERE id = ?
        `,
        args: [Number(id)],
      });

    if (
      Number(
        result.rowsAffected
      ) === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Fechamento não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,

      message:
        "Fechamento excluído. O histórico das vendas foi preservado.",
    });
  } catch (error: any) {
    console.error(
      "DELETE /api/fechamentos:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro ao excluir fechamento.",

        details:
          error?.message,
      },
      {
        status: 500,
      }
    );
  }
}