export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db, initDB } from "../../../lib/db";

// GET - Buscar fechamento por ID ou listar todos
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao buscar fechamentos" },
      { status: 500 }
    );
  }
}

// POST - Criar / Confirmar um novo fechamento
export async function POST(request: Request) {
  try {
    await initDB();

    const body = await request.json();

    // 1. Busca o maior 'numero' registrado para incrementar
    const maxNumeroResult = await db.execute({
      sql: "SELECT MAX(numero) as max_numero FROM fechamentos",
      args: []
    });

    const lastNumero = (maxNumeroResult.rows[0] as any)?.max_numero;
    const proximoNumero = Number(body.numero) || (lastNumero ? Number(lastNumero) + 1 : 1);

    const total = Number(body.total) || 0;
    const quantidadeVendas = Number(body.quantidade_vendas || body.quantidadeVendas) || 0;
    const quantidadeItens = Number(body.quantidade_itens || body.quantidadeItens) || 0;
    const vendaIds = Array.isArray(body.venda_ids)
      ? body.venda_ids
      : Array.isArray(body.vendaIds)
      ? body.vendaIds
      : [];
    const resumo = body.resumo || {};
    
    // Define a data/hora atual no formato ISO
    const createdAt = body.created_at || new Date().toISOString();

    // 2. Insere o registro incluindo 'numero' e 'created_at'
    const result = await db.execute({
      sql: `INSERT INTO fechamentos (numero, total, quantidade_vendas, quantidade_itens, venda_ids, resumo, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
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

    return NextResponse.json(
      {
        success: true,
        message: "Fechamento realizado com sucesso",
        id: result.lastInsertRowid ? Number(result.lastInsertRowid) : null,
        numero: proximoNumero
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao realizar fechamento" },
      { status: 500 }
    );
  }
}