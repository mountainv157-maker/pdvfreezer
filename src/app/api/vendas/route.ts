export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db, initDB } from "../../../lib/db";

/*
|--------------------------------------------------------------------------
| GARANTIR ESTRUTURA DA TABELA
|--------------------------------------------------------------------------
|
| A coluna fechamento_id identifica se a venda ainda está aberta
| ou se já pertence a algum fechamento.
|
| NULL = venda atual / aberta
| número = venda vinculada a um fechamento
|
|--------------------------------------------------------------------------
*/

async function garantirColunaFechamento() {
  try {
    await db.execute(`
      ALTER TABLE vendas
      ADD COLUMN fechamento_id INTEGER DEFAULT NULL
    `);
  } catch {
    /*
     * Se a coluna já existir, ignoramos o erro.
     */
  }
}

/*
|--------------------------------------------------------------------------
| GARANTIR BANCO
|--------------------------------------------------------------------------
*/

async function prepararBanco() {
  await initDB();
  await garantirColunaFechamento();
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| /api/vendas
|
| Retorna somente as vendas atuais.
|
| /api/vendas?historico=true
|
| Retorna todas as vendas que ainda estiverem na tabela.
|
|--------------------------------------------------------------------------
*/

export async function GET(req: Request) {
  try {
    await prepararBanco();

    const { searchParams } = new URL(req.url);

    const historico =
      searchParams.get("historico") === "true";

    let sql = `
      SELECT
        id,
        itens,
        total,
        pagamento,
        descricao,
        created_at,
        fechamento_id
      FROM vendas
    `;

    /*
    |--------------------------------------------------------------------------
    | VENDAS ATUAIS
    |--------------------------------------------------------------------------
    */

    if (!historico) {
      sql += `
        WHERE fechamento_id IS NULL
      `;
    }

    sql += `
      ORDER BY id DESC
    `;

    const result = await db.execute(sql);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error(
      "GET /api/vendas:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erro ao buscar vendas.",
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
| Cria uma nova venda.
|
| Toda nova venda começa com:
|
| fechamento_id = NULL
|
| Portanto ela pertence ao ciclo atual.
|
|--------------------------------------------------------------------------
*/

export async function POST(req: Request) {
  try {
    await prepararBanco();

    const body = await req.json();

    const {
      itens,
      total,
      pagamento,
      descricao,
    } = body;

    /*
    |--------------------------------------------------------------------------
    | VALIDAR ITENS
    |--------------------------------------------------------------------------
    */

    if (
      !Array.isArray(itens) ||
      itens.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Nenhum produto informado.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDAR PRODUTOS
    |--------------------------------------------------------------------------
    */

    for (const item of itens) {
      const produtoId =
        Number(item?.id);

      const quantidade =
        Number(item?.cartQtd);

      if (
        !Number.isFinite(produtoId) ||
        produtoId <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Produto inválido.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isFinite(quantidade) ||
        quantidade <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Quantidade inválida.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | BAIXAR ESTOQUE
    |--------------------------------------------------------------------------
    */

    for (const item of itens) {
      const produtoId =
        Number(item.id);

      const quantidade =
        Number(item.cartQtd);

      /*
      | Verifica se existe estoque suficiente.
      */

      const produtoResult =
        await db.execute({
          sql: `
            SELECT
              id,
              qtd
            FROM produtos
            WHERE id = ?
            LIMIT 1
          `,
          args: [produtoId],
        });

      if (
        produtoResult.rows.length === 0
      ) {
        return NextResponse.json(
          {
            error:
              `Produto ID ${produtoId} não encontrado.`,
          },
          {
            status: 404,
          }
        );
      }

      const estoqueAtual =
        Number(
          produtoResult.rows[0].qtd
        ) || 0;

      if (
        estoqueAtual < quantidade
      ) {
        return NextResponse.json(
          {
            error:
              `Estoque insuficiente para o produto ID ${produtoId}. Estoque disponível: ${estoqueAtual}.`,
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | ATUALIZAR ESTOQUE
    |--------------------------------------------------------------------------
    */

    for (const item of itens) {
      await db.execute({
        sql: `
          UPDATE produtos
          SET qtd = qtd - ?
          WHERE id = ?
        `,
        args: [
          Number(item.cartQtd),
          Number(item.id),
        ],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | VALORES
    |--------------------------------------------------------------------------
    */

    const totalNumerico =
      Number(total) || 0;

    const formaPagamento =
      String(
        pagamento || "outro"
      )
        .trim()
        .toLowerCase();

    const descricaoTexto =
      String(
        descricao || ""
      ).trim();

    /*
    |--------------------------------------------------------------------------
    | CRIAR VENDA
    |--------------------------------------------------------------------------
    |
    | fechamento_id fica NULL.
    |
    | Isso é MUITO importante.
    |
    | A venda só será encerrada quando o usuário
    | clicar em "Fazer fechamento".
    |
    |--------------------------------------------------------------------------
    */

    const result =
      await db.execute({
        sql: `
          INSERT INTO vendas (
            itens,
            total,
            pagamento,
            descricao,
            fechamento_id
          )
          VALUES (?, ?, ?, ?, NULL)
        `,
        args: [
          JSON.stringify(itens),

          totalNumerico,

          formaPagamento,

          descricaoTexto,
        ],
      });

    /*
    |--------------------------------------------------------------------------
    | RESPOSTA
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        ok: true,

        success: true,

        id: Number(
          result.lastInsertRowid
        ),

        message:
          "Venda registrada com sucesso.",
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "POST /api/vendas:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erro ao registrar venda.",
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
| /api/vendas?id=123
|
| Exclui uma venda ainda aberta.
|
| IMPORTANTE:
|
| Ao excluir uma venda aberta, os produtos voltam para o estoque.
|
| Venda que já pertence a um fechamento não pode ser excluída.
|
|--------------------------------------------------------------------------
*/

export async function DELETE(req: Request) {
  try {
    await prepararBanco();

    const { searchParams } =
      new URL(req.url);

    const idTexto =
      searchParams.get("id");

    if (!idTexto) {
      return NextResponse.json(
        {
          error:
            "ID da venda não informado.",
        },
        {
          status: 400,
        }
      );
    }

    const id =
      Number(idTexto);

    if (
      !Number.isFinite(id) ||
      id <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "ID da venda inválido.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | BUSCAR VENDA
    |--------------------------------------------------------------------------
    */

    const vendaResult =
      await db.execute({
        sql: `
          SELECT
            id,
            itens,
            fechamento_id
          FROM vendas
          WHERE id = ?
          LIMIT 1
        `,
        args: [id],
      });

    if (
      vendaResult.rows.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Venda não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    const venda =
      vendaResult.rows[0];

    /*
    |--------------------------------------------------------------------------
    | PROTEGER VENDA FECHADA
    |--------------------------------------------------------------------------
    */

    if (
      venda.fechamento_id !== null &&
      venda.fechamento_id !== undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Esta venda pertence a um fechamento e não pode ser apagada.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | DEVOLVER ESTOQUE
    |--------------------------------------------------------------------------
    */

    try {
      const itens =
        JSON.parse(
          String(
            venda.itens || "[]"
          )
        );

      if (Array.isArray(itens)) {
        for (const item of itens) {
          const produtoId =
            Number(item?.id);

          const quantidade =
            Number(
              item?.cartQtd ??
                item?.qtd ??
                0
            );

          if (
            !Number.isFinite(
              produtoId
            ) ||
            produtoId <= 0
          ) {
            continue;
          }

          if (
            !Number.isFinite(
              quantidade
            ) ||
            quantidade <= 0
          ) {
            continue;
          }

          await db.execute({
            sql: `
              UPDATE produtos
              SET qtd = qtd + ?
              WHERE id = ?
            `,
            args: [
              quantidade,
              produtoId,
            ],
          });
        }
      }
    } catch (error) {
      console.error(
        "Erro ao devolver estoque:",
        error
      );

      /*
       * Não interrompe a exclusão caso o JSON
       * dos itens esteja inválido.
       */
    }

    /*
    |--------------------------------------------------------------------------
    | EXCLUIR VENDA
    |--------------------------------------------------------------------------
    */

    const deleteResult =
      await db.execute({
        sql: `
          DELETE FROM vendas
          WHERE id = ?
          AND fechamento_id IS NULL
        `,
        args: [id],
      });

    if (
      Number(
        deleteResult.rowsAffected
      ) === 0
    ) {
      return NextResponse.json(
        {
          error:
            "A venda não pôde ser excluída.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | RESPOSTA
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      ok: true,

      success: true,

      message:
        "Venda excluída e estoque devolvido.",
    });
  } catch (error: any) {
    console.error(
      "DELETE /api/vendas:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erro ao excluir venda.",
      },
      {
        status: 500,
      }
    );
  }
}