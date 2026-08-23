export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "../../../lib/db";

async function ensureTables() {
  await initDB();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS fechamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      quantidade_vendas INTEGER NOT NULL DEFAULT 0,
      quantidade_itens INTEGER NOT NULL DEFAULT 0,
      venda_ids TEXT NOT NULL DEFAULT '[]',
      resumo TEXT NOT NULL DEFAULT '{}'
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vendas_log (
      id INTEGER PRIMARY KEY,
      itens TEXT NOT NULL,
      total REAL NOT NULL,
      pagamento TEXT NOT NULL,
      descricao TEXT,
      created_at TEXT NOT NULL,
      fechamento_id INTEGER
    )
  `);
}

export async function GET(req: NextRequest) {
  try {
    await ensureTables();
    const id = new URL(req.url).searchParams.get("id");

    if (id) {
      const r = await db.execute({ sql: "SELECT * FROM fechamentos WHERE id =? LIMIT 1", args: [Number(id)] });
      if (!r.rows.length) return NextResponse.json({ error: "Fechamento não encontrado" }, { status: 404 });

      const row: any = r.rows[0];
      let resumo = {};
      try { resumo = JSON.parse(row.resumo || "{}") } catch {}
      let venda_ids = [];
      try { venda_ids = JSON.parse(row.venda_ids || "[]") } catch {}

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

    const r = await db.execute("SELECT id, numero, created_at, total, quantidade_vendas, quantidade_itens FROM fechamentos ORDER BY numero DESC");
    return NextResponse.json(r.rows);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    await ensureTables();

    const vendasResult = await db.execute("SELECT * FROM vendas ORDER BY id ASC");
    if (!vendasResult.rows.length) {
      return NextResponse.json({ error: "Não existem vendas para fechar" }, { status: 400 });
    }

    const vendas = vendasResult.rows as any[];

    // Monta resumo simples e garantido
    let totalGeral = 0;
    let qtdItens = 0;
    const produtos: any = {};
    const porPagamento: any = {};

    for (const v of vendas) {
      totalGeral += Number(v.total) || 0;
      let itens = [];
      try { itens = JSON.parse(v.itens || "[]") } catch {}

      const pag = String(v.pagamento || "outro").toLowerCase();
      if (!porPagamento[pag]) porPagamento[pag] = { total: 0, qtd: 0 };
      porPagamento[pag].total += Number(v.total) || 0;

      for (const it of itens) {
        const q = Number(it.cartQtd || it.qtd || 0);
        qtdItens += q;
        const nome = String(it.nome || "Produto");
        if (!produtos[nome]) produtos[nome] = { qtd: 0, total: 0 };
        produtos[nome].qtd += q;
        produtos[nome].total += (Number(it.preco) || 0) * q;
      }
    }

    const resumo = {
      fechamentoGeral: { total: totalGeral, quantidadeVendas: vendas.length, quantidadeItens: qtdItens },
      porPagamento,
      produtos,
      porDescricao: [],
      semDescricao: { nome: "Sem descrição", total: totalGeral, produtos }
    };

    const numResult = await db.execute("SELECT COALESCE(MAX(numero),0)+1 as proximo FROM fechamentos");
    const numero = Number((numResult.rows[0] as any).proximo || 1);
    const created_at = new Date().toISOString();
    const venda_ids = vendas.map((v: any) => Number(v.id));

    const inserted = await db.execute({
      sql: "INSERT INTO fechamentos (numero, created_at, total, quantidade_vendas, quantidade_itens, venda_ids, resumo) VALUES (?,?,?,?,?,?,?)",
      args: [numero, created_at, totalGeral, vendas.length, qtdItens, JSON.stringify(venda_ids), JSON.stringify(resumo)]
    });

    const fechamentoId = Number(inserted.lastInsertRowid);

    // Copia para log
    for (const v of vendas) {
      await db.execute({
        sql: "INSERT OR IGNORE INTO vendas_log (id, itens, total, pagamento, descricao, created_at, fechamento_id) VALUES (?,?,?,?,?,?,?)",
        args: [v.id, v.itens, v.total, v.pagamento, v.descricao || "", v.created_at, fechamentoId]
      });
    }

    // Limpa vendas atuais
    await db.execute("DELETE FROM vendas");

    return NextResponse.json({ success: true, fechamento: { id: fechamentoId, numero, created_at, total: totalGeral, quantidade_vendas: vendas.length, quantidade_itens: qtdItens, venda_ids, resumo } }, { status: 201 });

  } catch (e: any) {
    console.error("POST fechamentos", e);
    return NextResponse.json({ error: "Erro ao fechar", details: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTables();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Informe ID" }, { status: 400 });
    await db.execute({ sql: "DELETE FROM fechamentos WHERE id =?", args: [Number(id)] });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}