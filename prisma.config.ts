import { defineConfig } from "@prisma/config"

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!, // chuyển từ schema sang đây
  },
})
