import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

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
| BANCO
|--------------------------------------------------------------------------
*/

async function criarTabela() {
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
}

/*
|--------------------------------------------------------------------------
| NORMALIZAÇÃO DA DESCRIÇÃO
|--------------------------------------------------------------------------
|
| Eduardo
| eduardo
| EDUARDO
|  Eduardo
| eDuArDo
|
| viram:
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
| MONTAR FECHAMENTO
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
  | PERCORRE VENDAS
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
          |----------------------------------------------------------
          | Mantém a primeira forma digitada.
          |
          | Ex:
          | Eduardo
          | eduardo
          |
          | Se "Eduardo" apareceu primeiro,
          | o fechamento mostrará "Eduardo".
          |----------------------------------------------------------
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
      | PRODUTOS GERAIS
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
      | PRODUTOS POR PAGAMENTO
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
      | PRODUTOS POR DESCRIÇÃO
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
  | ORDENA DESCRIÇÕES
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
| Lista todos os fechamentos.
|
|--------------------------------------------------------------------------
*/

export async function GET(
  request: NextRequest
) {
  try {
    await criarTabela();

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
          row.total
        ),

        quantidade_vendas:
          Number(
            row.quantidade_vendas
          ),

        quantidade_itens:
          Number(
            row.quantidade_itens
          ),

        venda_ids:
          JSON.parse(
            String(
              row.venda_ids ||
                "[]"
            )
          ),

        resumo,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | LISTAR TODOS
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
            row.total
          ),

          quantidade_vendas:
            Number(
              row.quantidade_vendas
            ),

          quantidade_itens:
            Number(
              row.quantidade_itens
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
| POST
|--------------------------------------------------------------------------
|
| POST /api/fechamentos
|
| Faz um novo fechamento.
|
| IMPORTANTE:
|
| O sistema procura somente vendas que ainda não
| pertencem a nenhum fechamento anterior.
|
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest
) {
  try {
    await criarTabela();

    /*
    |--------------------------------------------------------------------------
    | BUSCAR TODAS AS VENDAS
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

    const vendas =
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
                row.created_at
              ),
          }) as Venda
      );

    /*
    |--------------------------------------------------------------------------
    | DESCOBRIR VENDAS JÁ FECHADAS
    |--------------------------------------------------------------------------
    */

    const fechamentosResult =
      await db.execute(`
        SELECT venda_ids
        FROM fechamentos
      `);

    const vendasJaFechadas =
      new Set<number>();

    for (const row of
      fechamentosResult.rows) {
      try {
        const ids =
          JSON.parse(
            String(
              row.venda_ids ||
                "[]"
            )
          );

        if (Array.isArray(ids)) {
          for (const id of ids) {
            vendasJaFechadas.add(
              Number(id)
            );
          }
        }
      } catch {
        // Ignora registros inválidos.
      }
    }

    /*
    |--------------------------------------------------------------------------
    | SOMENTE VENDAS NOVAS
    |--------------------------------------------------------------------------
    */

    const vendasDoFechamento =
      vendas.filter(
        (venda) =>
          !vendasJaFechadas.has(
            venda.id
          )
      );

    /*
    |--------------------------------------------------------------------------
    | NÃO TEM VENDA NOVA
    |--------------------------------------------------------------------------
    */

    if (
      vendasDoFechamento.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Não existem vendas novas para fazer um fechamento.",
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
      montarResumo(
        vendasDoFechamento
      );

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
    | IDS DAS VENDAS
    |--------------------------------------------------------------------------
    */

    const vendaIds =
      vendasDoFechamento.map(
        (v) => v.id
      );

    /*
    |--------------------------------------------------------------------------
    | SALVAR NO TURSO
    |--------------------------------------------------------------------------
    */

    const insert =
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

    /*
    |--------------------------------------------------------------------------
    | RESPOSTA
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: true,

        message:
          "Fechamento realizado com sucesso.",

        fechamento: {
          id: Number(
            insert.lastInsertRowid
          ),

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
| DELETE
|--------------------------------------------------------------------------
|
| DELETE /api/fechamentos?id=1
|
| Exclui somente o registro do fechamento.
|
| ATENÇÃO:
| As vendas NÃO são apagadas.
|
|--------------------------------------------------------------------------
*/

export async function DELETE(
  request: NextRequest
) {
  try {
    await criarTabela();

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
        "Fechamento excluído.",
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