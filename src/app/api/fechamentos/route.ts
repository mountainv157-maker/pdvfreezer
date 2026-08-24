export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db, initDB } from "../../../lib/db";

export async function GET(request: Request) {
  try {
    await initDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const r = await db.execute({
        sql: "SELECT * FROM fechamentos WHERE id = ? LIMIT 1",
        args: [Number(id)]
      });

      if (!r.rows.length) {
        return NextResponse.json(
          { error: "Fechamento não encontrado" },
          { status: 404 }
        );
      }

      const row: any = r.rows[0];

      let resumo: any = {};
      let precisaRefazer = true;

      try {
        resumo = JSON.parse(row.resumo || "{}");

        if (
          resumo &&
          resumo.fechamentoGeral &&
          Number(resumo.fechamentoGeral.total) >= 0
        ) {
          precisaRefazer = false;
        }
      } catch {}

      if (precisaRefazer) {
        let vendaIds: number[] = [];

        try {
          vendaIds = JSON.parse(row.venda_ids || "[]");
        } catch {}

        if (vendaIds.length > 0) {
          const placeholders = vendaIds.map(() => "?").join(",");

          const vendasLog = await db.execute({
            sql: `SELECT * FROM vendas_log WHERE id IN (${placeholders})`,
            args: vendaIds
          });

          let totalGeral = 0;
          let quantidadeItens = 0;
          const porPagamento: Record<string, any> = {};
          const produtos: Record<string, any> = {};
          const porDescricao: Record<string, any> = {};
          const semDescricao = {
            nome: "Sem descrição",
            total: 0,
            produtos: {}
          };

          for (const v of vendasLog.rows as any[]) {
            const totalVenda = Number(v.total) || 0;
            totalGeral += totalVenda;

            const pagamento = String(
              v.pagamento || "outro"
            )
              .trim()
              .toLowerCase();

            if (!porPagamento[pagamento]) {
              porPagamento[pagamento] = {
                total: 0,
                produtos: {}
              };
            }

            porPagamento[pagamento].total += totalVenda;

            let itens: any[] = [];

            try {
              itens =
                typeof v.itens === "string"
                  ? JSON.parse(v.itens)
                  : v.itens || [];
            } catch {
              itens = [];
            }

            const descricao = String(
              v.descricao || ""
            ).trim();

            const chaveDescricao = descricao
              .toLocaleLowerCase("pt-BR");

            let grupoDescricao: any;

            if (chaveDescricao) {
              if (!porDescricao[chaveDescricao]) {
                porDescricao[chaveDescricao] = {
                  nome: descricao,
                  total: 0,
                  produtos: {}
                };
              }

              grupoDescricao =
                porDescricao[chaveDescricao];

              grupoDescricao.total += totalVenda;
            } else {
              semDescricao.total += totalVenda;
              grupoDescricao = semDescricao;
            }

            for (const item of itens) {
              const nome = String(
                item.nome || ""
              ).trim();

              const qtd =
                Number(item.cartQtd) || 0;

              const preco =
                parseFloat(item.preco) || 0;

              const valor = preco * qtd;

              quantidadeItens += qtd;

              if (!produtos[nome]) {
                produtos[nome] = {
                  qtd: 0,
                  total: 0
                };
              }

              produtos[nome].qtd += qtd;
              produtos[nome].total += valor;

              if (
                !porPagamento[pagamento]
                  .produtos[nome]
              ) {
                porPagamento[pagamento].produtos[
                  nome
                ] = {
                  qtd: 0,
                  total: 0
                };
              }

              porPagamento[pagamento].produtos[
                nome
              ].qtd += qtd;

              porPagamento[pagamento].produtos[
                nome
              ].total += valor;

              if (
                !grupoDescricao.produtos[nome]
              ) {
                grupoDescricao.produtos[nome] = {
                  qtd: 0,
                  total: 0
                };
              }

              grupoDescricao.produtos[nome].qtd +=
                qtd;

              grupoDescricao.produtos[nome].total +=
                valor;
            }
          }

          resumo = {
            fechamentoGeral: {
              total: totalGeral,
              quantidadeVendas:
                vendaIds.length,
              quantidadeItens
            },
            porPagamento,
            produtos,
            porDescricao:
              Object.entries(
                porDescricao
              ),
            semDescricao
          };

          await db.execute({
            sql: "UPDATE fechamentos SET resumo = ? WHERE id = ?",
            args: [
              JSON.stringify(resumo),
              Number(id)
            ]
          });
        }
      }

      let venda_ids: any[] = [];

      try {
        venda_ids = JSON.parse(
          row.venda_ids || "[]"
        );
      } catch {}

      return NextResponse.json({
        id: Number(row.id),
        numero: Number(row.numero),
        created_at: String(row.created_at),
        total: Number(row.total),
        quantidade_vendas: Number(
          row.quantidade_vendas
        ),
        quantidade_itens: Number(
          row.quantidade_itens
        ),
        venda_ids,
        resumo
      });
    }

    const result = await db.execute({
      sql: "SELECT * FROM fechamentos ORDER BY id DESC",
      args: []
    });

    const fechamentos = (
      result.rows as any[]
    ).map((row) => {
      let resumo: any = {};

      try {
        resumo = JSON.parse(
          row.resumo || "{}"
        );
      } catch {}

      let venda_ids: any[] = [];

      try {
        venda_ids = JSON.parse(
          row.venda_ids || "[]"
        );
      } catch {}

      return {
        id: Number(row.id),
        numero: Number(row.numero),
        created_at: String(row.created_at),
        total: Number(row.total),
        quantidade_vendas: Number(
          row.quantidade_vendas
        ),
        quantidade_itens: Number(
          row.quantidade_itens
        ),
        venda_ids,
        resumo
      };
    });

    return NextResponse.json(fechamentos);
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Erro ao buscar fechamentos"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initDB();

    const body = await request.json();

    let vendasParaFechar: any[] = [];

    if (
      Array.isArray(body.vendas) &&
      body.vendas.length > 0
    ) {
      vendasParaFechar = body.vendas;
    } else {
      const vendasAbertas = await db.execute({
        sql: `
          SELECT *
          FROM vendas
          ORDER BY id ASC
        `,
        args: []
      });

      vendasParaFechar =
        vendasAbertas.rows as any[];
    }

    if (!vendasParaFechar.length) {
      return NextResponse.json(
        {
          error:
            "Não existem vendas para fechar."
        },
        { status: 400 }
      );
    }

    const maxNumeroResult = await db.execute({
      sql: `
        SELECT MAX(numero) as max_numero
        FROM fechamentos
      `,
      args: []
    });

    const lastNumero = (
      maxNumeroResult.rows[0] as any
    )?.max_numero;

    const proximoNumero =
      Number(body.numero) ||
      (lastNumero
        ? Number(lastNumero) + 1
        : 1);

    const vendaIds = vendasParaFechar
      .map((v) => Number(v.id))
      .filter((id) => id > 0);

    if (!vendaIds.length) {
      return NextResponse.json(
        {
          error:
            "Nenhuma venda válida encontrada para fechar."
        },
        { status: 400 }
      );
    }

    const total = vendasParaFechar.reduce(
      (s, v) =>
        s + Number(v.total || 0),
      0
    );

    let quantidadeItens = 0;

    for (const venda of vendasParaFechar) {
      let itens: any[] = [];

      try {
        itens =
          typeof venda.itens === "string"
            ? JSON.parse(venda.itens)
            : venda.itens || [];
      } catch {
        itens = [];
      }

      for (const item of itens) {
        quantidadeItens +=
          Number(item.cartQtd) || 0;
      }
    }

    const quantidadeVendas =
      vendasParaFechar.length;

    const resumo =
      body.resumo ||
      body.dados ||
      {
        fechamentoGeral: {
          total,
          quantidadeVendas,
          quantidadeItens
        }
      };

    const createdAt =
      body.created_at ||
      new Date().toISOString();

    const result = await db.execute({
      sql: `
        INSERT INTO fechamentos
        (
          numero,
          total,
          quantidade_vendas,
          quantidade_itens,
          venda_ids,
          resumo,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        proximoNumero,
        total,
        quantidadeVendas,
        quantidadeItens,
        JSON.stringify(vendaIds),
        JSON.stringify(resumo),
        createdAt
      ]
    });

    const newFechamentoId =
      result.lastInsertRowid
        ? Number(result.lastInsertRowid)
        : null;

    if (!newFechamentoId) {
      throw new Error(
        "Não foi possível criar o fechamento."
      );
    }

    const placeholders = vendaIds
      .map(() => "?")
      .join(",");

    await db.execute({
      sql: `
        UPDATE vendas_log
        SET fechamento_id = ?
        WHERE id IN (${placeholders})
      `,
      args: [
        newFechamentoId,
        ...vendaIds
      ]
    });

    await db.execute({
      sql: `
        DELETE FROM vendas
        WHERE id IN (${placeholders})
      `,
      args: vendaIds
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Fechamento realizado com sucesso. Novo ciclo iniciado.",
        id: newFechamentoId,
        numero: proximoNumero,
        total,
        quantidade_vendas: quantidadeVendas,
        quantidade_itens: quantidadeItens,
        venda_ids: vendaIds
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Erro ao realizar fechamento"
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await initDB();

    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error:
            "ID do fechamento não informado"
        },
        { status: 400 }
      );
    }

    const fechamentoId = Number(id);

    const fechamento =
      await db.execute({
        sql: `
          SELECT *
          FROM fechamentos
          WHERE id = ?
          LIMIT 1
        `,
        args: [fechamentoId]
      });

    if (!fechamento.rows.length) {
      return NextResponse.json(
        {
          error:
            "Fechamento não encontrado"
        },
        { status: 404 }
      );
    }

    await db.execute({
      sql: `
        UPDATE vendas_log
        SET fechamento_id = NULL
        WHERE fechamento_id = ?
      `,
      args: [fechamentoId]
    });

    const result = await db.execute({
      sql: `
        DELETE FROM fechamentos
        WHERE id = ?
      `,
      args: [fechamentoId]
    });

    return NextResponse.json({
      success: true,
      message:
        "Fechamento apagado com sucesso",
      affectedRows:
        result.rowsAffected
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Erro ao apagar fechamento"
      },
      { status: 500 }
    );
  }
}