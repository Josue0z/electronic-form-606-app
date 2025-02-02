import 'dotenv/config'
import { app } from './app'
app.set('PORT', process.env.PORT ?? 3000)


app.listen(app.get('PORT'),'0.0.0.0', () =>
  console.log(`
🚀 Server ready at: http://localhost:3000
⭐️ See sample requests: https://github.com/prisma/prisma-examples/blob/latest/orm/testing-express/README.md#using-the-rest-api`),
)
