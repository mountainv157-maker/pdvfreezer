export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db, initDB } from "../../../lib/db";

/*
|--------------------------------------------------------------------------
| GARANTIR ESTRUTURA DA TABELA
|--------------------------------------------------------------------------
*/

async function garantirColunaFechamento() {
  try {
    await db.execute(`
      ALTER TABLE vendas
      ADD COLUMN fechamento_id INTEGER DEFAULT NULL
    `);
  } catch (e: any) {
    /*
     * Se a coluna já existir, o SQLite/Turso retorna erro.
     * Nesse caso simplesmente ignoramos.
     */
  }
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| /api/vendas
|
| Por padrão:
| retorna somente vendas ainda NÃO fechadas.
|
| /api/vendas?historico=true
|
| retorna TODAS as vendas.
|
|--------------------------------------------------------------------------
*/

export async function GET(req: Request) {
  try {
    await initDB();

    await garantirColunaFechamento();

    const { searchParams } =
      new URL(req.url);

    const historico =
      searchParams.get("historico") === "true";

    let sql = `
      SELECT *
      FROM vendas
    `;

    /*
     * DASH
     *
     * Somente vendas que ainda
     * não pertencem a fechamento.
     */

    if (!historico) {
      sql += `
        WHERE fechamento_id IS NULL
      `;
    }

    sql += `
      ORDER BY id DESC
    `;

    const rs = await db.execute(sql);

    return NextResponse.json(rs.rows);

  } catch (e: any) {

    console.error(
      "GET /api/vendas:",
      e
    );

    return NextResponse.json(
      {
        error: e.message,
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
| fechamento_id começa NULL.
|
| Isso significa:
|
| VENDA ABERTA
|
| Ela aparecerá no Dash até o próximo fechamento.
|
|--------------------------------------------------------------------------
*/

export async function POST(req: Request) {
  try {
    await initDB();

    await garantirColunaFechamento();

    const {
      itens,
      total,
      pagamento,
      descricao,
    } = await req.json();

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
    | BAIXAR ESTOQUE
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
          Number(item.cartQtd) || 0,
          Number(item.id),
        ],
      });

    }

    /*
    |--------------------------------------------------------------------------
    | CRIAR VENDA
    |--------------------------------------------------------------------------
    |
    | fechamento_id não é informado.
    |
    | Portanto fica NULL.
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

          Number(total) || 0,

          pagamento || "outro",

          descricao || "",
        ],
      });

    return NextResponse.json({
      ok: true,

      id: Number(
        result.lastInsertRowid
      ),
    });

  } catch (e: any) {

    console.error(
      "POST /api/vendas:",
      e
    );

    return NextResponse.json(
      {
        error: e.message,
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
| Exclui uma venda individual.
|
|--------------------------------------------------------------------------
*/

export async function DELETE(req: Request) {
  try {

    await initDB();

    await garantirColunaFechamento();

    const { searchParams } =
      new URL(req.url);

    const id =
      searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error:
            "ID da venda não informado",
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
          SELECT *
          FROM vendas
          WHERE id = ?
          LIMIT 1
        `,
        args: [Number(id)],
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
    | NÃO PERMITIR APAGAR VENDA JÁ FECHADA
    |--------------------------------------------------------------------------
    |
    | Isso protege o histórico dos fechamentos.
    |
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
    | DEVOLVER PRODUTOS AO ESTOQUE
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

          await db.execute({
            sql: `
              UPDATE produtos
              SET qtd = qtd + ?
              WHERE id = ?
            `,
            args: [
              Number(
                item.cartQtd
              ) || 0,

              Number(item.id),
            ],
          });

        }

      }

    } catch {
      /*
       * Caso os itens estejam inválidos,
       * continua para excluir a venda.
       */
    }

    /*
    |--------------------------------------------------------------------------
    | APAGAR VENDA
    |--------------------------------------------------------------------------
    */

    await db.execute({
      sql: `
        DELETE FROM vendas
        WHERE id = ?
      `,
      args: [Number(id)],
    });

    return NextResponse.json({
      ok: true,
    });

  } catch (e: any) {

    console.error(
      "DELETE /api/vendas:",
      e
    );

    return NextResponse.json(
      {
        error: e.message,
      },
      {
        status: 500,
      }
    );
  }
}