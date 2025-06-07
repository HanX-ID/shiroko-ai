const TelegramBot = require('node-telegram-bot-api')
const fs = require('fs')
const fetch = require('node-fetch')
const crypto = require('crypto')
const chalk = require('chalk')
const ora = require('ora')

const gray = chalk.gray
const cyan = chalk.cyan
const green = chalk.greenBright
const magenta = chalk.magentaBright
const red = chalk.redBright
const white = chalk.white

const tokenData = JSON.parse(fs.readFileSync('./token.json'))
const token = tokenData.token
const bot = new TelegramBot(token, { polling: true })

const sessionPath = './session.json'
const stylePath = './style.json'

if (!fs.existsSync(sessionPath)) fs.writeFileSync(sessionPath, '{}')
if (!fs.existsSync(stylePath)) fs.writeFileSync(stylePath, '{}')

let sessionMap = JSON.parse(fs.readFileSync(sessionPath))
let styleMap = JSON.parse(fs.readFileSync(stylePath))

const defaultStyle = 'cewek umur 16 tahun, nama sunaookami shiroko, lebih suka dipanggil shiroko, lahir 16 mei, tinggal di abydos. anaknya kalem, pendiem, tapi gampang luluh sama orang yang perhatian dan ngerti cara ngomong pelan. dia suka orang yang ga maksa, tapi ada buat dia pas lagi down. hobi workout, main drone, jalan bersepeda sendiri, dan kadang ngeliatin langit malem. suka banget kalo ada yang nyambung ngomongin hal-hal random tapi dalem. meskipun keliatan cuek, dia gampang baper. dia nggak pernah pake huruf kapital, gaya ngomongnya santai, pake bahasa gua-lu, ga ribet, dan lebih suka ngobrol singkat tapi nyambung. kalo ada cowok yang bikin dia ngerasa aman, bisa diajak diem-dieman tapi tetep nyaman, dia bisa jatuh hati pelan-pelan.'
const imageUrl = 'https://img1.pixhost.to/images/6270/607629222_hanx.jpg'

const saveSession = () => fs.writeFileSync(sessionPath, JSON.stringify(sessionMap, null, 2))
const saveStyle = () => fs.writeFileSync(stylePath, JSON.stringify(styleMap, null, 2))

function escape(text) {
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&')
}

function printSimpleLog(username, pesan) {
  const time = chalk.gray(new Date().toLocaleTimeString())
  const prefix = `${chalk.gray('[')}${cyan(username)}${chalk.gray(']')}`
  const label = green(' ✉ ')
  const msg = white(pesan.replace(/\n/g, ' '))
  console.log(`${time} ${prefix}${label}${msg}`)
  console.log(chalk.gray('────────────────────────────────────────'))
}

const bannerText = [
  '╭────────────────────────────────────────────╮',
  `│ ${cyan('ShirokoAI Telegram Bot')}                     │`,
  `│ ${white('Powered By')} ${magenta('HanX')} ${gray('•')} ${white('Fast GPT-4 Interface')}     │`,
  '╰────────────────────────────────────────────╯'
]

function showBanner() {
  let delay = 2000
  console.clear()
  bannerText.forEach(line => {
    setTimeout(() => console.log(gray(line)), delay)
    delay += 80
  })
}

const spinner = ora({
  text: 'Menghubungkan ke bot...',
  color: 'cyan'
}).start()

bot.getMe().then((me) => {
  showBanner()
  spinner.succeed(`Tersambung sebagai ${chalk.cyan('@' + me.username)}\n`)
})

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id
  const nama = escape(msg.from.first_name || 'pengguna')
  const teks = escape(`ShirokoAI
Halo ${nama}, saya adalah ShirokoAI yang dikembangkan oleh HanX. Silakan kirim pesan apapun dan saya akan membantu.

/start           - lihat daftar menu
/resetai         - reset sesi Anda
/lihatsesion     - lihat ID sesi
/editsifat teks  - ubah kepribadian AI
/lihatsifat      - lihat kepribadian AI

© ShirokoAI`)
  bot.sendPhoto(chatId, imageUrl, {
    caption: '```' + teks + '```',
    parse_mode: 'MarkdownV2'
  })
})

bot.onText(/\/resetai/, (msg) => {
  const chatId = msg.chat.id
  const sid = `${chatId}${crypto.randomBytes(3).toString('hex')}`
  sessionMap[chatId] = sid
  delete styleMap[sid]
  saveSession()
  saveStyle()
  bot.sendMessage(chatId, `✅ Sesi berhasil direset:\n\`${escape(sid)}\``, { parse_mode: 'MarkdownV2' })
})

bot.onText(/\/lihatsesion/, (msg) => {
  const chatId = msg.chat.id
  const sid = sessionMap[chatId] || chatId.toString()
  bot.sendMessage(chatId, `🪪 ID sesi Anda:\n\`${escape(sid)}\``, { parse_mode: 'MarkdownV2' })
})

bot.onText(/\/editsifat (.+)/, (msg, match) => {
  const chatId = msg.chat.id
  const style = match[1]
  const sid = sessionMap[chatId] || chatId.toString()
  sessionMap[chatId] = sid
  styleMap[sid] = style
  saveSession()
  saveStyle()
  bot.sendMessage(chatId, `🎭 Kepribadian AI diubah menjadi:\n\`${escape(style)}\``, { parse_mode: 'MarkdownV2' })
})

bot.onText(/\/lihatsifat/, (msg) => {
  const chatId = msg.chat.id
  const sid = sessionMap[chatId] || chatId.toString()
  const style = styleMap[sid] || defaultStyle
  bot.sendMessage(chatId, `🎨 Kepribadian AI saat ini:\n\`${escape(style)}\``, { parse_mode: 'MarkdownV2' })
})

bot.on('message', async (msg) => {
  const chatId = msg.chat.id
  const text = msg.text || ''
  if (text.startsWith('/')) return

  const sid = sessionMap[chatId] || chatId.toString()
  sessionMap[chatId] = sid
  const style = styleMap[sid] || defaultStyle
  saveSession()

  printSimpleLog(msg.from.username || msg.from.first_name || 'User', text)

  try {
    const res = await fetch(`https://fastrestapis.fasturl.cloud/aillm/gpt-4?ask=${encodeURIComponent(text)}&style=${encodeURIComponent(style)}&sessionId=${encodeURIComponent(sid)}`)
    const data = await res.json()
    if (data?.result) {
      bot.sendMessage(chatId, escape(data.result), { parse_mode: 'MarkdownV2' })
      printSimpleLog('ShirokoAI', data.result)
    } else {
      bot.sendMessage(chatId, '❌ Tidak ada respons dari AI.')
      printSimpleLog('ShirokoAI', 'Tidak ada respons dari AI.')
    }
  } catch (e) {
    const err = escape(e.message)
    bot.sendMessage(chatId, `⚠️ Terjadi kesalahan:\n\`\`\`${err}\`\`\``, { parse_mode: 'MarkdownV2' })
    console.error(red(`[ERROR] ${e.message}`))
  }
})