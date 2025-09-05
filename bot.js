import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';

const BOT_TOKEN = '7663354158:AAE4IPRivuKaufQfPKAG0M3EGcZnMenNRWw';
const YOUR_USER_ID = '6981934499'; // Замените на ваш настоящий числовой ID
const YOUR_TON_ADDRESS = 'UQAtQQcUpO_Y_VrUi2mVqVkUikLa2O3LrIP1bExtj3ck9PAs'; // Проверьте этот адрес
const TON_API_KEY = 'ваш_настоящий_api_ключ_tonapi'; // Получите на https://tonconsole.com/

const bot = new Telegraf(BOT_TOKEN);
const userStars = new Map();
const pendingTransactions = new Map();
const pendingApprovals = new Map();

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

// Проверка TON транзакций (исправленная версия)
async function checkTonTransaction(userId, amount) {
  try {
    const response = await axios.get(`https://tonapi.io/v2/accounts/${YOUR_TON_ADDRESS}/events`, {
      headers: { 
        Authorization: `Bearer ${TON_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('TON API Response:', response.data);
    
    const events = response.data.events || [];
    for (const event of events) {
      if (event.actions) {
        for (const action of event.actions) {
          if (action.type === 'ton_transfer' && 
              action.ton_transfer &&
              action.ton_transfer.recipient &&
              action.ton_transfer.recipient.address === YOUR_TON_ADDRESS) {
            
            // Конвертируем нанотоны в TON
            const receivedAmount = action.ton_transfer.amount / 1000000000;
            const expectedAmount = amount;
            
            // Проверяем сумму (допускаем небольшую погрешность)
            if (receivedAmount >= expectedAmount * 0.9) {
              // Проверяем комментарий
              const comment = action.ton_transfer.comment || '';
              if (comment.includes(`ID:${userId}`)) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  } catch (error) {
    console.log('Ошибка проверки TON:', error.response?.data || error.message);
    return false;
  }
}

// Добавьте эту функцию для ответа на callback queries
bot.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery(); // Важно: отвечаем на все callback queries
});

// ... остальной код без изменений до обработчиков TON ...

// Выбор суммы TON (исправленный обработчик)
bot.action(/ton_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery(); // Ответим на callback query
  
  const starsAmount = parseInt(ctx.match[1]);
  const userId = ctx.from.id;
  const tonAmount = RATES.TON[starsAmount];

  // Сохраняем транзакцию
  const txId = `ton_${userId}_${Date.now()}`;
  pendingTransactions.set(txId, {
    userId,
    starsAmount,
    type: 'TON',
    amount: tonAmount,
    timestamp: Date.now()
  });

  await ctx.editMessageText(
    `💎 *Пополнение на ${starsAmount} звезд*\n\n` +
    `💰 Сумма: ${tonAmount} TON\n\n` +
    `➡️ *Адрес TON:*\n\`${YOUR_TON_ADDRESS}\`\n\n` +
    `📝 *В комментарии укажите:*\n\`ID:${userId}\`\n\n` +
    `✅ После отправки TON я проверю платеж и запрошу подтверждение у администратора\n\n` +
    `⚠️ *ВАЖНО:* Убедитесь, что указали правильный комментарий!`,
    {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Проверить статус', `check_ton_${starsAmount}_${txId}`)],
        [Markup.button.callback('↩️ Назад', 'ton_donate')]
      ])
    }
  );
});

// Проверка TON платежа (исправленный обработчик)
bot.action(/check_ton_(\d+)_(.+)/, async (ctx) => {
  await ctx.answerCbQuery('🔍 Проверяем платеж...');
  
  const starsAmount = parseInt(ctx.match[1]);
  const txId = ctx.match[2];
  const userId = ctx.from.id;
  const tonAmount = RATES.TON[starsAmount];
  
  const txData = pendingTransactions.get(txId);
  if (!txData) {
    await ctx.editMessageText(
      `❌ *Транзакция не найдена!*\n\n` +
      `Пожалуйста, начните процесс заново.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('↩️ Назад', 'ton_donate')]
        ])
      }
    );
    return;
  }
  
  const isConfirmed = await checkTonTransaction(userId, tonAmount);
  
  if (isConfirmed) {
    // Создаем запрос на подтверждение
    const approvalId = `ton_${userId}_${Date.now()}`;
    pendingApprovals.set(approvalId, {
      userId,
      starsAmount,
      type: 'TON',
      amount: tonAmount,
      timestamp: Date.now()
    });
    
    // Удаляем из ожидающих транзакций
    pendingTransactions.delete(txId);
    
    // Уведомление админу
    try {
      await bot.telegram.sendMessage(
        YOUR_USER_ID,
        `💎 *ЗАПРОС НА ПОДТВЕРЖДЕНИЕ TON ПЛАТЕЖА*\n\n` +
        `👤 Игрок: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
        `📌 Username: @${ctx.from.username || 'нет'}\n` +
        `🆔 ID: ${userId}\n` +
        `💎 Сумма: ${starsAmount} звезд (${tonAmount} TON)\n` +
        `📋 ID транзакции: ${approvalId}\n\n` +
        `✅ Для подтверждения:\n` +
        `/approve_${approvalId}\n\n` +
        `❌ Для отклонения:\n` +
        `/reject_${approvalId}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Ошибка отправки уведомления админу:', error);
    }
    
    await ctx.editMessageText(
      `✅ *Платеж обнаружен!*\n\n` +
      `Ваш платеж найден в системе. Ожидайте подтверждения администратора.\n` +
      `Обычно это занимает 5-15 минут.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Проверить статус', 'check_balance')]
        ])
      }
    );
  } else {
    await ctx.editMessageText(
      `❌ *Платеж не найден!*\n\n` +
      `Проверьте:\n` +
      `1. Правильность адреса: \`${YOUR_TON_ADDRESS}\`\n` +
      `2. Наличие комментария: \`ID:${userId}\`\n` +
      `3. Сумму перевода: ${tonAmount} TON\n\n` +
      `Попробуйте проверить снова через несколько минут.`,
      {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Проверить снова', `check_ton_${starsAmount}_${txId}`)],
          [Markup.button.callback('↩️ Назад', 'ton_donate')]
        ])
      }
    );
  }
});

// ... остальной код без изменений ...

// Запуск бота
bot.launch().then(() => {
  console.log('Бот запущен!');
}).catch(err => {
  console.log('Ошибка запуска бота:', err);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));