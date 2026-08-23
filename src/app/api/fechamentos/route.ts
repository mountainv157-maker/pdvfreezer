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
  cartQtd?: number;
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

  porPagamento: Record<string, PagamentoResumo>;

  porDescricao: DescricaoResumo[];

  semDescricao: DescricaoResumo;

  produtos: Record<string, ProdutoResumo>;
};

/*
|--------------------------------------------------------------------------
| UTILITÁRIOS
|--------------------------------------------------------------------------
*/

function normalizarDescricao(
  descricao: string | null | undefined
): string {
  return String(descricao || "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

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
| GARANTIR COLUNA
|--------------------------------------------------------------------------
|
| Isso é importante porque CREATE TABLE IF NOT EXISTS NÃO atualiza
| tabelas antigas.
|
|--------------------------------------------------------------------------
*/

async function garantirColuna(
  tabela: string,
  coluna: string,
  definicao: string
) {
  const result = await db.execute(`
    PRAGMA table_info(${tabela})
  `);

  const existe = result.rows.some(
    (row: any) =>
      String(row.name) === coluna
  );

  if (!existe) {
    await db.execute(`
      ALTER TABLE ${tabela}
      ADD COLUMN ${coluna} ${definicao}
    `);
  }
}

/*
|--------------------------------------------------------------------------
| CRIAR / ATUALIZAR TABELAS
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
  | MIGRAÇÃO DE TABELAS ANTIGAS
  |--------------------------------------------------------------------------
  */

  await garantirColuna(
    "fechamentos",
    "numero",
    "INTEGER NOT NULL DEFAULT 1"
  );

  await garantirColuna(
    "fechamentos",
    "created_at",
    "TEXT NOT NULL DEFAULT ''"
  );

  await garantirColuna(
    "fechamentos",
    "total",
    "REAL NOT NULL DEFAULT 0"
  );

  await garantirColuna(
    "fechamentos",
    "quantidade_vendas",
    "INTEGER NOT NULL DEFAULT 0"
  );

  await garantirColuna(
    "fechamentos",
    "quantidade_itens",
    "INTEGER NOT NULL DEFAULT 0"
  );

  await garantirColuna(
    "fechamentos",
    "venda_ids",
    "TEXT NOT NULL DEFAULT '[]'"
  );

  await garantirColuna(
    "fechamentos",
    "resumo",
    "TEXT NOT NULL DEFAULT '{}'"
  );

  /*
  |--------------------------------------------------------------------------
  | LOG DE VENDAS
  |--------------------------------------------------------------------------
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

  await garantirColuna(
    "vendas_log",
    "itens",
    "TEXT NOT NULL DEFAULT '[]'"
  );

  await garantirColuna(
    "vendas_log",
    "total",
    "REAL NOT NULL DEFAULT 0"
  );

  await garantirColuna(
    "vendas_log",
    "pagamento",
    "TEXT NOT NULL DEFAULT 'outro'"
  );

  await garantirColuna(
    "vendas_log",
    "descricao",
    "TEXT NOT NULL DEFAULT ''"
  );

  await garantirColuna(
    "vendas_log",
    "created_at",
    "TEXT NOT NULL DEFAULT ''"
  );

  await garantirColuna(
    "vendas_log",
    "fechamento_id",
    "INTEGER"
  );
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
  | PERCORRER VENDAS
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
      String(
        venda.descricao || ""
      ).trim();

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
      grupoDescricao =
        semDescricao;

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
        !porPagamento[
          pagamento
        ].produtos[nome]
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

  /*
  |--------------------------------------------------------------------------
  | RETORNO
  |--------------------------------------------------------------------------
  */

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
| Sem ID:
| lista os fechamentos.
|
| Com ID:
| retorna o fechamento completo + resumo detalhado.
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
    | BUSCAR FECHAMENTO INDIVIDUAL
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
          args: [
            Number(id),
          ],
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

      const row: any =
        result.rows[0];

      /*
      |--------------------------------------------------------------------------
      | RESUMO
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | VENDA IDS
      |--------------------------------------------------------------------------
      */

      let vendaIds: number[] = [];

      try {
        const parsed =
          JSON.parse(
            String(
              row.venda_ids ||
                "[]"
            )
          );

        if (
          Array.isArray(parsed)
        ) {
          vendaIds =
            parsed.map(
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
            row.created_at || ""
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
    | LISTAR FECHAMENTOS
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
        (row: any) => ({
          id: Number(
            row.id
          ),

          numero: Number(
            row.numero
          ),

          created_at:
            String(
              row.created_at || ""
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
        (row: any) =>
          ({
            id: Number(
              row.id
            ),

            itens: String(
              row.itens || "[]"
            ),

            total: Number(
              row.total || 0
            ),

            pagamento:
              String(
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
    | NÃO TEM VENDAS
    |--------------------------------------------------------------------------
    */

    if (
      vendas.length === 0
    ) {
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
      montarResumo(
        vendas
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
    | DATA
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
      vendas.map(
        (venda) =>
          venda.id
      );

    /*
    |--------------------------------------------------------------------------
    | IMPORTANTE:
    |
    | CONVERTER O RESUMO UMA ÚNICA VEZ.
    |--------------------------------------------------------------------------
    */

    const resumoJSON =
      JSON.stringify(
        resumo
      );

    /*
    |--------------------------------------------------------------------------
    | VERIFICAR SE RESUMO É VÁLIDO
    |--------------------------------------------------------------------------
    */

    if (
      !resumoJSON ||
      resumoJSON === "{}"
    ) {
      throw new Error(
        "Não foi possível gerar o resumo detalhado do fechamento."
      );
    }

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

          Number(
            resumo
              .fechamentoGeral
              .total
          ) || 0,

          Number(
            resumo
              .fechamentoGeral
              .quantidadeVendas
          ) || 0,

          Number(
            resumo
              .fechamentoGeral
              .quantidadeItens
          ) || 0,

          JSON.stringify(
            vendaIds
          ),

          resumoJSON,
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
    */

    for (const venda of vendas) {
      const existe =
        await db.execute({
          sql: `
            SELECT id
            FROM vendas_log
            WHERE id = ?
            LIMIT 1
          `,

          args: [
            venda.id,
          ],
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

            Number(
              venda.total
            ) || 0,

            venda.pagamento ||
              "outro",

            venda.descricao ||
              "",

            venda.created_at,

            fechamentoId,
          ],
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | APAGAR VENDAS DO CICLO ATUAL
    |--------------------------------------------------------------------------
    |
    | Isso NÃO altera estoque.
    |
    |--------------------------------------------------------------------------
    */

    await db.execute(`
      DELETE FROM vendas
    `);

    /*
    |--------------------------------------------------------------------------
    | RETORNO
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: true,

        message:
          "Fechamento realizado com sucesso.",

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
| DELETE — APAGAR RELATÓRIO
|--------------------------------------------------------------------------
|
| DELETE /api/fechamentos?id=1
|
| Apaga somente o relatório.
|
| NÃO apaga vendas_log.
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

    const fechamento =
      await db.execute({
        sql: `
          SELECT id
          FROM fechamentos
          WHERE id = ?
          LIMIT 1
        `,

        args: [
          Number(id),
        ],
      });

    if (
      fechamento.rows.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Relatório não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | APAGAR RELATÓRIO
    |--------------------------------------------------------------------------
    */

    await db.execute({
      sql: `
        DELETE FROM fechamentos
        WHERE id = ?
      `,

      args: [
        Number(id),
      ],
    });

    /*
    |--------------------------------------------------------------------------
    | IMPORTANTE
    |--------------------------------------------------------------------------
    |
    | vendas_log permanece.
    |
    | Isso permite manter o histórico das vendas
    | mesmo que o relatório seja apagado.
    |
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,

      message:
        "Relatório apagado com sucesso.",
    });
  } catch (error: any) {
    console.error(
      "DELETE /api/fechamentos:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro ao apagar relatório.",

        details:
          error?.message,
      },
      {
        status: 500,
      }
    );
  }
}