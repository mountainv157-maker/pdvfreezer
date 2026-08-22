// src/lib/schema.ts
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const produtos = sqliteTable("produtos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  preco: text("preco").notNull(),
  qtd: integer("qtd").notNull().default(0),
  imagem: text("imagem"),
});