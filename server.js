const express = require('express');
const { Telegraf } = require('telegraf');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Конфигурация бота
const BOT_TOKEN = process.env.BOT_TOKEN || '7663354158:AAE4IPRivuKaufQfPKAG0M3EGcZnMenNRWw';
const YOUR_USER_ID = process.env.YOUR_USER_ID || '6981934499';
const YOUR_TON_ADDRESS = process.env.YOUR_TON_ADDRESS || 'UQAtQQcUpO_Y_VrUi2mVqVkUikLa2O3LrIP1bExtj3ck9PAs';
const TON_API_KEY = process.env.TON_API_KEY || '185.3.181.32';

const bot = new Telegraf(BOT_TOKEN);
const userStars = new Map();
const pendingTransactions = new Map();

// Курс обмена
const RATES = {
  TON: { 
    15: 0.1,
    50: 0.2, 
    80: 0.3
  },
  TG_STARS: {
    15: 15,
    50: 50,
    80: 80
  }
};

// Middleware
app.use(express.json());

// Проверка TON транзакций
async function checkTonTransaction(userId, amount) {
  try {
    const response = await axios.get(`https://tonapi.io/v2/accounts/${YOUR_TON_ADDRESS}/events`, {
      headers: { Authorization: `Bearer ${TON_API_KEY}` }
    });
    
    const transactions = response.data.events || [];
    for (const event of transactions) {
      if (event.actions) {
        for (const action of event.actions) {
          if (action.type === 'ton_transfer' && 
              action.ton_transfer.recipient.address === YOUR_TON_ADDRESS &&
              action.ton_transfer.amount >= amount * 1000000000 * 0.9) {
            if (action.ton_transfer.comment && action.ton_transfer.comment.includes(`ID:${userId}`)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  } catch (error) {
    console.log('Ошибка проверки TON:', error.message);
    return false;
  }
}

// Команда для админа - пополнение баланса
bot.command('add', async (ctx) => {
  if (ctx.from.id.toString() === YOUR_USER_ID) {
    const args = ctx.message.text.split(' ');
    if (args.length === 3) {
      const userId = args[1];
      const amount = parseInt(args[2]);
      
      if (!isNaN(amount) && amount > 0) {
        const currentBalance = userStars.get(userId) || 0;
        const newBalance = currentBalance + amount;
        userStars.set(userId, newBalance);
        
        await ctx.reply(`✅ Баланс пользователя ${userId} пополнен на ${amount} звезд\nНовый баланс: ${newBalance} ⭐️`);
        
        try {
          await bot.telegram.sendMessage(
            userId,
            `🎉 *Ваш баланс пополнен!*\n\n💎 Начислено: ${amount} звезд\n💰 Теперь у вас: ${newBalance} ⭐️\n\nСпасибо за покупку!`,
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          await ctx.reply(`⚠️ Не удалось уведомить пользователя ${userId}. Возможно, он не запускал бота.`);
        }
      } else {
        await ctx.reply('❌ Неверный формат команды. Используйте: /add USER_ID AMOUNT');
      }
    } else {
      await ctx.reply('❌ Неверный формат команды. Используйте: /add USER_ID AMOUNT');
    }
  }
});

// Проверка баланса (команда для админа)
bot.command('balance', async (ctx) => {
  if (ctx.from.id.toString() === YOUR_USER_ID) {
    const args = ctx.message.text.split(' ');
    if (args.length === 2) {
      const userId = args[1];
      const balance = userStars.get(userId) || 0;
      await ctx.reply(`💰 Баланс пользователя ${userId}: ${balance} звезд`);
    } else {
      await ctx.reply('❌ Используйте: /balance USER_ID');
    }
  }
});

// Команда старт
bot.command('start', async (ctx) => {
  const userId = ctx.from.id;
  const currentStars = userStars.get(userId) || 0;
  
  await ctx.reply(
    `🎮 *GIFT MASTER* - Пополнение баланса\n\n⭐️ Ваш баланс: ${currentStars} звезд\n\n💎 *Способы пополнения:*\n• 💎 TON - автоматическое зачисление\n• ⭐️ Звёзды TG - ручное зачисление\n\nВыберите способ:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💎 TON (авто)', callback_data: 'ton_donate' }],
          [{ text: '⭐️ Звёзды TG', callback_data: 'tgstars_donate' }],
          [{ text: '💰 Баланс', callback_data: 'check_balance' }]
        ]
      }
    }
  );
});

// Пополнение TON
bot.action('ton_donate', async (ctx) => {
  await ctx.editMessageText(
    `💎 *Пополнение TON*\n\n💰 *Пакеты:*\n• 15 звезд - 0.1 TON\n• 50 звезд - 0.2 TON\n• 80 звезд - 0.3 TON\n\nВыберите сумму:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '15 звезд (0.1 TON)', callback_data: 'ton_15' }],
          [{ text: '50 звезд (0.2 TON)', callback_data: 'ton_50' }],
          [{ text: '80 звезд (0.3 TON)', callback_data: 'ton_80' }],
          [{ text: '↩️ Назад', callback_data: 'back_to_start' }]
        ]
      }
    }
  );
});

// Выбор суммы TON
bot.action(/ton_(\d+)/, async (ctx) => {
  const starsAmount = parseInt(ctx.match[1]);
  const userId = ctx.from.id;
  const tonAmount = RATES.TON[starsAmount];

  await ctx.editMessageText(
    `💎 *Пополнение на ${starsAmount} звезд*\n\n💰 Сумма: ${tonAmount} TON\n\n➡️ *Адрес TON:*\n\`${YOUR_TON_ADDRESS}\`\n\n📝 *В комментарии укажите:*\n\`ID:${userId}\`\n\n✅ Платеж проверится автоматически в течение 5-15 минут\n\n⚠️ *ВАЖНО:* После отправки TON нажмите кнопку "🔄 Проверить статус" для проверки платежа`,
    {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Проверить статус', callback_data: `check_ton_${starsAmount}` }],
          [{ text: '↩️ Назад', callback_data: 'ton_donate' }]
        ]
      }
    }
  );

  pendingTransactions.set(`ton_${userId}_${Date.now()}`, {
    userId,
    starsAmount,
    type: 'TON',
    amount: tonAmount,
    timestamp: Date.now()
  });
});

// Проверка TON платежа
bot.action(/check_ton_(\d+)/, async (ctx) => {
  const starsAmount = parseInt(ctx.match[1]);
  const userId = ctx.from.id;
  const tonAmount = RATES.TON[starsAmount];
  
  await ctx.answerCbQuery('🔍 Проверяем платеж...');
  
  const isConfirmed = await checkTonTransaction(userId, tonAmount);
  
  if (isConfirmed) {
    const newBalance = (userStars.get(userId) || 0) + starsAmount;
    userStars.set(userId, newBalance);
    
    await ctx.editMessageText(
      `🎉 *Оплата TON подтверждена!*\n\n💎 Начислено: ${starsAmount} звезд\n💰 Баланс: ${newBalance} ⭐️\n\nСпасибо за покупку!`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💰 Проверить баланс', callback_data: 'check_balance' }],
            [{ text: '💎 Пополнить еще', callback_data: 'ton_donate' }]
          ]
        }
      }
    );
  } else {
    await ctx.editMessageText(
      `❌ *Платеж не найден!*\n\nПроверьте:\n1. Правильность адреса: \`${YOUR_TON_ADDRESS}\`\n2. Наличие комментария: \`ID:${userId}\`\n3. Сумму перевода: ${tonAmount} TON\n\nПопробуйте проверить снова через несколько минут.`,
      {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Проверить снова', callback_data: `check_ton_${starsAmount}` }],
            [{ text: '↩️ Назад', callback_data: 'ton_donate' }]
          ]
        }
      }
    );
  }
});

// Пополнение звездами TG
bot.action('tgstars_donate', async (ctx) => {
  await ctx.editMessageText(
    `⭐️ *Пополнение звёздами Telegram*\n\n💰 *Пакеты:*\n• 15 звезд - 15⭐️ TG\n• 50 звезд - 50⭐️ TG\n• 80 звезд - 80⭐️ TG\n\n*Инструкция:*\n1. Отправьте звёзды @HOKKEY77\n2. Нажмите "✅ Я отправил(а)"\n3. Я проверю и пополню баланс`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '15 звезд (15⭐️ TG)', callback_data: 'tgstars_15' }],
          [{ text: '50 звезд (50⭐️ TG)', callback_data: 'tgstars_50' }],
          [{ text: '80 звезд (80⭐️ TG)', callback_data: 'tgstars_80' }],
          [{ text: '↩️ Назад', callback_data: 'back_to_start' }]
        ]
      }
    }
  );
});

// Выбор суммы звезд TG
bot.action(/tgstars_(\d+)/, async (ctx) => {
  const starsAmount = parseInt(ctx.match[1]);
  const userId = ctx.from.id;
  const tgStarsAmount = RATES.TG_STARS[starsAmount];

  await ctx.editMessageText(
    `⭐️ *Пополнение на ${starsAmount} звезд*\n\n💰 Стоимость: ${tgStarsAmount} звёзд TG\n\n*Инструкция:*\n1. Отправьте ${tgStarsAmount}⭐️ @HOKKEY77\n2. Нажмите кнопку ниже после отправки\n3. Я проверю и пополню ваш баланс`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Я отправил(а) звёзды', callback_data: `confirm_tgstars_${starsAmount}` }],
          [{ text: '↩️ Назад', callback_data: 'tgstars_donate' }]
        ]
      }
    }
  );
});

// Подтверждение отправки звезд TG
bot.action(/confirm_tgstars_(\d+)/, async (ctx) => {
  const starsAmount = parseInt(ctx.match[1]);
  const userId = ctx.from.id;
  const tgStarsAmount = RATES.TG_STARS[starsAmount];

  await ctx.editMessageText(
    `✅ *Запрос принят!*\n\nЯ проверю получение ${tgStarsAmount} звёзд и пополню ваш баланс.\nОбычно это занимает 5-15 минут.`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Проверить статус', callback_data: 'check_balance' }]
        ]
      }
    }
  );

  // Уведомление вам в личные сообщения
  try {
    await bot.telegram.sendMessage(
      YOUR_USER_ID,
      `⭐️ *ЗАПРОС НА ПОПОЛНЕНИЕ ЗВЁЗДАМИ*\n\n👤 Игрок: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n📌 Username: @${ctx.from.username || 'нет'}\n🆔 ID: ${userId}\n💎 Ожидает: ${starsAmount} игровых звезд\n💰 Должен отправить: ${tgStarsAmount}⭐️ TG\n\n✅ Для пополнения отправьте:\n/add ${userId} ${starsAmount}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Ошибка отправки уведомления админу:', error);
  }
});

// Проверка баланса
bot.action('check_balance', async (ctx) => {
  const userId = ctx.from.id;
  const currentStars = userStars.get(userId) || 0;
  await ctx.reply(`💰 Ваш баланс: ${currentStars} звезд`);
});

// Назад в главное меню
bot.action('back_to_start', async (ctx) => {
  await ctx.deleteMessage();
  const userId = ctx.from.id;
  const currentStars = userStars.get(userId) || 0;
  
  await ctx.telegram.sendMessage(
    ctx.from.id,
    `🎮 *GIFT MASTER* - Пополнение баланса\n\n⭐️ Ваш баланс: ${currentStars} звезд\n\n💎 *Способы пополнения:*\n• 💎 TON - автоматическое зачисление\n• ⭐️ Звёзды TG - ручное зачисление\n\nВыберите способ:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💎 TON (авто)', callback_data: 'ton_donate' }],
          [{ text: '⭐️ Звёзды TG', callback_data: 'tgstars_donate' }],
          [{ text: '💰 Баланс', callback_data: 'check_balance' }]
        ]
      }
    }
  );
});

// Автопроверка TON транзакций
setInterval(async () => {
  for (const [txId, txData] of pendingTransactions.entries()) {
    if (txData.type === 'TON' && Date.now() - txData.timestamp < 3600000) {
      const isConfirmed = await checkTonTransaction(txData.userId, txData.amount);
      
      if (isConfirmed) {
        const newBalance = (userStars.get(txData.userId) || 0) + txData.starsAmount;
        userStars.set(txData.userId, newBalance);
        
        await bot.telegram.sendMessage(
          txData.userId,
          `🎉 *Оплата TON подтверждена!*\n\n💎 Начислено: ${txData.starsAmount} звезд\n💰 Баланс: ${newBalance} ⭐️`,
          { parse_mode: 'Markdown' }
        );
        
        pendingTransactions.delete(txId);
      }
    }
  }
}, 30000);

// Запуск сервера
app.get('/', (req, res) => {
  res.send('Gift Master Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Запуск бота
bot.launch().then(() => {
  console.log('Бот запущен!');
}).catch(err => {
  console.log('Ошибка запуска бота:', err);
});

// Graceful shutdown
process.once('SIGINT', () => {
  bot.stop('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  process.exit(0);
});