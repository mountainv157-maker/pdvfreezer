export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db, initDB } from "../../../lib/db";

export async function GET(request: Request) {
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
        Number(resumo.fechamentoGeral.total) > 0
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

        for (const v of vendasLog.rows as any[]) {
          totalGeral += Number(v.total) || 0;
        }

        resumo = {
          fechamentoGeral: {
            total: totalGeral,
            quantidadeVendas: vendaIds.length,
            quantidadeItens: 0
          },
          porPagamento: {},
          produtos: {},
          porDescricao: [],
          semDescricao: {
            nome: "Sem descrição",
            total: totalGeral,
            produtos: {}
          }
        };

        await db.execute({
          sql: "UPDATE fechamentos SET resumo = ? WHERE id = ?",
          args: [JSON.stringify(resumo), Number(id)]
        });
      }
    }

    let venda_ids: any[] = [];

    try {
      venda_ids = JSON.parse(row.venda_ids || "[]");
    } catch {}

    return NextResponse.json({
      id: Number(row.id),
      numero: Number(row.numero),
      created_at: String(row.created_at),
      total: Number(row.total),
      quantidade_vendas: Number(row.quantidade_vendas),
      quantidade_itens: Number(row.quantidade_itens),
      venda_ids,
      resumo
    });
  }

  const result = await db.execute({
    sql: "SELECT * FROM fechamentos ORDER BY id DESC",
    args: []
  });

  const fechamentos = (result.rows as any[]).map((row) => {
    let resumo: any = {};

    try {
      resumo = JSON.parse(row.resumo || "{}");
    } catch {}

    let venda_ids: any[] = [];

    try {
      venda_ids = JSON.parse(row.venda_ids || "[]");
    } catch {}

    return {
      id: Number(row.id),
      numero: Number(row.numero),
      created_at: String(row.created_at),
      total: Number(row.total),
      quantidade_vendas: Number(row.quantidade_vendas),
      quantidade_itens: Number(row.quantidade_itens),
      venda_ids,
      resumo
    };
  });

  return NextResponse.json(fechamentos);
}