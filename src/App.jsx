import React, { useState, useEffect, useRef } from 'react';

function GiftBattle() {
  // Получаем ID пользователя из localStorage или генерируем новый
  const getUserId = () => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('userId', userId);
    }
    return userId;
  };

  const userId = getUserId();
  const [balance, setBalance] = useState(15);
  const [isSpinning, setIsSpinning] = useState(false);
  const [resultText, setResultText] = useState('');
  const [currentRoulette, setCurrentRoulette] = useState(0);
  const [slotResults, setSlotResults] = useState([null, null, null]);
  const [slotStopped, setSlotStopped] = useState([false, false, false]);
  const [wonGift, setWonGift] = useState(null);
  const [showGiftNotification, setShowGiftNotification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Состояния для игры в кости
  const [isRolling, setIsRolling] = useState(false);
  const [odds, setOdds] = useState([12.0, 11.0, 10.0, 9.0, 8.0, 7.0, 6.0, 5.0, 4.0, 3.0, 2.0, 1.0]);
  const [bets, setBets] = useState(Array(12).fill(0));
  const [diceResultText, setDiceResultText] = useState('');
  const [diceValue, setDiceValue] = useState(1);
  const [diceHistory, setDiceHistory] = useState([]);
  const [totalBet, setTotalBet] = useState(0);
  
  const slotsContainerRefs = [useRef(null), useRef(null), useRef(null)];

  const roulettes = [
    { 
      name: "Обычная", 
      cost: 15,
      gifts: [
        { 
          id: 1, 
          name: "Мишка", 
          value: 15, 
          image: "🐻", 
          chance: 9,
          stars: 15
        },
        { 
          id: 2, 
          name: "Сердечко", 
          value: 15, 
          image: "❤️", 
          chance: 9,
          stars: 15
        },
        { 
          id: 3, 
          name: "роза", 
          value: 25, 
          image: "💐", 
          chance: 5,
          stars: 25
        },
        { 
          id: 0, 
          name: "Проигрыш", 
          value: 0, 
          image: "❌", 
          chance: 30
        },
      ],
      winChance: 25
    },
    { 
      name: "Редкая", 
      cost: 25,
      gifts: [
        { 
          id: 4, 
          name: "Тортик", 
          value: 50, 
          image: "🎂", 
          chance: 15,
          stars: 50
        },
        { 
          id: 5, 
          name: "Ракета", 
          value: 50, 
          image: "🚀", 
          chance: 15,
          stars: 50
        },
        { 
          id: 0, 
          name: "Проигрыш", 
          value: 0, 
          image: "❌", 
          chance: 55
        }
      ],
      winChance: 40
    },
    { 
      name: "Эпическая", 
      cost: 50,
      gifts: [
        { 
          id: 6, 
          name: "Алмаз", 
          value: 100, 
          image: "💎", 
          chance: 15,
          stars: 100
        },
        { 
          id: 7, 
          name: "Кубок", 
          value: 100, 
          image: "🏆", 
          chance: 15,
          stars: 100
        },
        { 
          id: 8, 
          name: "Кольцо", 
          value: 100, 
          image: "💍", 
          chance: 15,
          stars: 100
        },
        { 
          id: 9, 
          name: "Календарик", 
          value: 350, 
          image: "🗓️", 
          chance: 2,
          stars: 350
        },
        { 
          id: 0, 
          name: "Проигрыш", 
          value: 0, 
          image: "❌", 
          chance: 53
        }
      ],
      winChance: 30
    }
  ];

  // Функция для получения баланса с сервера
  const fetchBalance = async () => {
    try {
      // Временно используем localStorage
      const savedBalance = localStorage.getItem(`balance_${userId}`);
      if (savedBalance) {
        setBalance(parseInt(savedBalance));
      } else {
        localStorage.setItem(`balance_${userId}`, '15');
        setBalance(15);
      }
    } catch (error) {
      console.error('Ошибка получения баланса:', error);
    }
  };

  // Функция для обновления баланса на сервере
  const updateBalance = async (newBalance) => {
    try {
      // Временно используем localStorage
      localStorage.setItem(`balance_${userId}`, newBalance.toString());
      setBalance(newBalance);
    } catch (error) {
      console.error('Ошибка обновления баланса:', error);
    }
  };

  // Получаем баланс при загрузке компонента
  useEffect(() => {
    fetchBalance();
    
    // Интервал для проверки обновлений баланса (каждые 30 секунд)
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  // Функция для отправки уведомления админу о выигрыше
  const sendWinNotification = async (gift) => {
    // Получаем ID пользователя из localStorage
    const userId = localStorage.getItem('userId');
    
    const message = `Пользователь ${userId} выиграл ${gift.name} (${gift.stars}⭐️) в рулетке "${roulettes[currentRoulette].name}"`;
    
    try {
      // Открываем Telegram с ссылкой на бота и передаем информацию о выигрыше
      const telegramUrl = `https://t.me/HOKKEY77?start=win_${userId}_${gift.id}_${roulettes[currentRoulette].name}`;
      window.open(telegramUrl, '_blank');
      
      // Показываем пользователю инструкцию
      alert(`🎉 Поздравляем с выигрышем! Открывается Telegram для связи с администратором.\n\nВаш ID: ${userId}\nСохраните его для подтверждения получения подарка!`);
    } catch (error) {
      console.error('Ошибка отправки уведомления:', error);
      alert("Не удалось открыть Telegram. Свяжитесь с @HOKKEY77 вручную и сообщите о выигрыше.");
    }
  };

  // Функции для игры в кости
  const updateBet = (number, amount) => {
    const newBets = [...bets];
    
    if (amount > 0 && totalBet + amount > balance && !isDemoMode) {
      return;
    }
    
    if (newBets[number - 1] + amount >= 0) {
      newBets[number - 1] += amount;
      setBets(newBets);
      setTotalBet(prev => prev + amount);
    }
  };

  const clearBets = () => {
    setBets(Array(12).fill(0));
    setTotalBet(0);
  };

  const rollDice = async () => {
    if (isRolling || totalBet === 0) return;
    
    setIsRolling(true);
    setDiceResultText("🎲 Бросаем кости...");
    
    // В демо-режиме не списываем ставку
    if (!isDemoMode) {
      await updateBalance(balance - totalBet);
    }
    
    // Анимация броска
    let rolls = 0;
    const maxRolls = 10;
    const rollInterval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      rolls++;
      
      if (rolls >= maxRolls) {
        clearInterval(rollInterval);
        
        setTimeout(async () => {
          const diceResult = Math.floor(Math.random() * 6) + 1;
          setDiceValue(diceResult);
          
          // Проверяем выигрыши
          let winAmount = 0;
          if (bets[diceResult - 1] > 0) {
            winAmount = Math.floor(bets[diceResult - 1] * odds[diceResult - 1]);
            // В демо-режиме не начисляем выигрыш
            if (!isDemoMode) {
              await updateBalance(balance - totalBet + winAmount);
            }
          }
          
          const resultMessage = isDemoMode 
            ? `🎲 Выпало: ${diceResult}${winAmount > 0 ? ` | Демо-выигрыш: ${winAmount} ⭐️` : ''}` 
            : `🎲 Выпало: ${diceResult}${winAmount > 0 ? ` | Вы выиграли: ${winAmount} ⭐️` : ''}`;
          
          setDiceResultText(resultMessage);
          
          // Добавляем результат в история
          setDiceHistory(prev => {
            const newHistory = [diceResult, ...prev];
            return newHistory.slice(0, 5);
          });
          
          // Сбрасываем ставки
          clearBets();
          setIsRolling(false);
        }, 500);
      }
    }, 100);
  };

  const resetSlotAnimations = () => {
    slotsContainerRefs.forEach(ref => {
      if (ref.current) {
        ref.current.style.transition = 'none';
        ref.current.style.transform = 'translateY(0)';
      }
    });
  };

  const spinGiftBattle = async () => {
    const cost = roulettes[currentRoulette].cost;
    
    if (balance < cost && !isDemoMode) {
      return;
    }
    
    if (isSpinning) return;
    
    setIsSpinning(true);
    setResultText('');
    setSlotStopped([false, false, false]);
    setWonGift(null);
    setShowGiftNotification(false);
    
    setTimeout(async () => {
      resetSlotAnimations();
      
      // В демо-режиме не списываем стоимость вращения
      if (!isDemoMode) {
        await updateBalance(balance - cost);
      }
      
      // Определяем, будет ли выигрыш
      const isWin = isDemoMode ? false : Math.random() * 100 <= roulettes[currentRoulette].winChance;
      
      let finalGift = null;
      const newSlotResults = [];
      
      if (isWin) {
        // Генерируем выигрышный подарок
        const winGifts = roulettes[currentRoulette].gifts.filter(g => g.id !== 0);
        const winTotal = winGifts.reduce((sum, gift) => sum + gift.chance, 0);
        const winRandom = Math.random() * winTotal;
        let winAccumulated = 0;
        
        for (const gift of winGifts) {
          winAccumulated += gift.chance;
          if (winRandom <= winAccumulated) {
            finalGift = gift;
            break;
          }
        }
        
        // Заполняем все три слота одинаковым подарком
        newSlotResults.push(finalGift, finalGift, finalGift);
      } else {
        // Генерируем проигрыш - три разных подарка
        const availableGifts = roulettes[currentRoulette].gifts.filter(g => g.id !== 0);
        
        // Гарантируем, что все три подарка будут разными
        const usedIndices = new Set();
        for (let i = 0; i < 3; i++) {
          let randomIndex;
          do {
            randomIndex = Math.floor(Math.random() * availableGifts.length);
          } while (usedIndices.has(randomIndex) && availableGifts.length > 2);
          
          usedIndices.add(randomIndex);
          newSlotResults.push(availableGifts[randomIndex]);
        }
        
        // Устанавливаем проигрышный подарок
        finalGift = roulettes[currentRoulette].gifts.find(g => g.id === 0);
      }
      
      setSlotResults(newSlotResults);
      
      setTimeout(() => {
        slotsContainerRefs.forEach((ref, index) => {
          if (ref.current && newSlotResults[index]) {
            const container = ref.current;
            const slotHeight = 80;
            const spinCycles = 20 + index * 2;
            
            const giftIndex = roulettes[currentRoulette].gifts.findIndex(
              g => g && g.id === newSlotResults[index].id
            );
            
            // Проверяем, что giftIndex корректен
            if (giftIndex !== -1) {
              const targetPosition = -((spinCycles * roulettes[currentRoulette].gifts.length + giftIndex) * slotHeight);
              
              container.style.transition = `transform ${3 + index * 0.5}s cubic-bezier(0.25,0.1,0.25,1)`;
              container.style.transform = `translateY(${targetPosition}px)`;
            }
          }
        });
      }, 50);
      
      setTimeout(() => setSlotStopped([true, false, false]), 3000);
      setTimeout(() => setSlotStopped([true, true, false]), 3500);
      setTimeout(async () => {
        setSlotStopped([true, true, true]);
        setIsSpinning(false);
        
        // Проверяем, выиграл ли игрок (три одинаковых подарка)
        const isActualWin = newSlotResults[0] && newSlotResults[1] && newSlotResults[2] &&
                           newSlotResults[0].id === newSlotResults[1].id && 
                           newSlotResults[1].id === newSlotResults[2].id;
        
        if (isActualWin && finalGift && finalGift.id !== 0) {
          setWonGift(finalGift);
          setShowGiftNotification(true);
          setResultText(`🎉 Вы выиграли ${finalGift.name}! +${finalGift.stars}⭐️`);
          if (!isDemoMode) {
            await updateBalance(balance - cost + finalGift.stars);
          }
        } else {
          setResultText(isDemoMode ? "❌ Демо-режим: выигрыши отключены" : "❌ Не повезло! Попробуйте еще раз.");
        }
      }, 4000);
    }, 10);
  };

  const closeGiftNotification = () => {
    setShowGiftNotification(false);
    setWonGift(null);
  };

  const nextRoulette = () => {
    setCurrentRoulette((prev) => (prev + 1) % roulettes.length);
    setSlotResults([null, null, null]);
    setSlotStopped([false, false, false]);
    setResultText('');
    resetSlotAnimations();
  };

  const toggleDemoMode = () => {
    setIsDemoMode(!isDemoMode);
    setResultText('');
    setDiceResultText('');
  };

  const generateSlotElements = (slotIndex) => {
    const elements = [];
    const currentGifts = roulettes[currentRoulette].gifts;
    
    // Увеличиваем количество элементов для плавной анимации
    const multiplier = 25;
    
    for (let i = 0; i < multiplier * currentGifts.length; i++) {
      const giftIndex = i % currentGifts.length;
      const gift = currentGifts[giftIndex];
      
      // Пропускаем пустые элементы
      if (!gift) continue;
      
      elements.push(
        <div key={i} style={{
          width: '80px', 
          height: '80px', 
          margin: '0 auto', 
          background: '#ffffff',
          borderRadius: '10px', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          border: '2px solid #007bff',
          padding: '8px', 
          boxSizing: 'border-box'
        }}>
          <div style={{ 
            fontSize: '2.5rem', 
            lineHeight: '1', 
            display: 'flex',
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '40px'
          }}>
            {gift.image}
          </div>
          <div style={{ 
            color: '#007bff', 
            fontWeight: 'bold', 
            fontSize: '12px', 
            marginTop: '5px',
            textAlign: 'center'
          }}>
            {gift.value > 0 ? `${gift.stars}★` : gift.name}
          </div>
        </div>
      );
    }
    
    return elements;
  };

  return (
    <div style={{ 
      margin: 0, 
      padding: '15px', 
      background: '#ffffff', 
      color: '##333',
      textAlign: 'center', 
      minHeight: '100vh', 
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }}>
      <div style={{ 
        maxWidth: '400px', 
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        
        {/* Шапка с балансом */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          marginBottom: '20px', 
          gap: '15px',
          width: '100%'
        }}>
          <h1 style={{ 
            color: '#007bff', 
            margin: '0', 
            fontSize: '28px', 
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #007bff, #0056b3)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🎁 GIFT MASTER
          </h1>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '10px 20px', 
            background: 'linear-gradient(145deg, #f8f9fa, #e9ecef)',
            borderRadius: '50px',
            border: '2px solid #007bff',
            width: '100%',
            maxWidth: '200px',
            justifyContent: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#007bff' }}>
              ⭐️ {balance} звезд
            </div>
          </div>

          {/* Кнопка переключения режима */}
          <button 
            onClick={toggleDemoMode}
            style={{
              padding: '10px 15px',
              background: isDemoMode ? '#6c757d' : 'linear-gradient(145deg, #28a745, #20c997)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              width: '100%',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              boxSizing: 'border-box'
            }}
          >
            {isDemoMode ? '🔓 Перейти в реальный режим' : '🔒 Перейти в демо-режим'}
          </button>

          {/* Индикатор режима */}
          <div style={{ 
            background: isDemoMode ? '#fff3cd' : '#d4edda', 
            padding: '10px 15px', 
            borderRadius: '10px',
            border: `1px solid ${isDemoMode ? '#ffeaa7' : '#c3e6cb'}`,
            color: isDemoMode ? '#856404' : '#155724',
            fontSize: '14px',
            width: '100%',
            textAlign: 'center'
          }}>
            {isDemoMode ? '🎮 Демо-режим • Бесплатная игра без выигрышей' : '💰 Реальный режим • Игра за звезды с выигрышами'}
          </div>
        </div>

        {/* Игровой автомат */}
        <div style={{ 
          width: '100%',
          background: '#f8f9fa',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '20px',
          border: '2px solid #e9ecef',
          boxSizing: 'border-box'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px', textAlign: 'center', color: '#007bff' }}>
            🎰 Игровой автомат
          </div>
          
          {/* Выбор рулетки */}
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
            <button 
              onClick={() => setCurrentRoulette((prev) => (prev - 1 + roulettes.length) % roulettes.length)}
              style={{
                padding: '8px 12px',
                background: '#007bff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
            >
              ◀️
            </button>
            
            <div style={{
              background: 'linear-gradient(145deg, #007bff, #0056b3)',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '12px',
              fontWeight: 'bold',
              minWidth: '120px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
            }}>
              {roulettes[currentRoulette].name}
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                {isDemoMode ? 'Бесплатно' : `${roulettes[currentRoulette].cost} ⭐️`}
              </div>
            </div>
            
            <button 
              onClick={nextRoulette}
              style={{
                padding: '8px 12px',
                background: '#007bff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
            >
              ▶️
            </button>
          </div>

          {/* Игровой автомат */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '10px', 
            marginBottom: '20px',
          }}>
            {[0, 1, 2].map((slotIndex) => (
              <div key={slotIndex} style={{
                width: '80px',
                height: '80px',
                overflow: 'hidden',
                position: 'relative',
                background: '#ffffff',
                borderRadius: '10px',
                border: '3px solid #007bff',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
              }}>
                <div 
                  ref={slotsContainerRefs[slotIndex]}
                  style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transition: 'transform 0.1s ease'
                  }}
                >
                  {generateSlotElements(slotIndex)}
                </div>
              </div>
            ))}
          </div>

          {/* Кнопка вращения */}
          <button 
            onClick={spinGiftBattle}
            disabled={isSpinning || (!isDemoMode && balance < roulettes[currentRoulette].cost)}
            style={{
              padding: '15px',
              background: isSpinning ? '#6c757d' : (isDemoMode ? '#28a745' : (balance < roulettes[currentRoulette].cost ? '#dc3545' : 'linear-gradient(145deg, #ff6a00, #ff9a00)')),
              color: '#ffffff',
              border: 'none',
              borderRadius: '15px',
              cursor: (isSpinning || (!isDemoMode && balance < roulettes[currentRoulette].cost)) ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              marginBottom: '15px',
              width: '100%',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              boxSizing: 'border-box'
            }}
          >
            {isSpinning ? '🌀 Вращается...' : 
            isDemoMode ? '🎰 Бесплатное вращение' : 
            balance < roulettes[currentRoulette].cost ? '❌ Недостаточно звезд' : `🎰 Крутить за ${roulettes[currentRoulette].cost}⭐️`}
          </button>

          {resultText && (
            <div style={{
              background: resultText.includes('🎉') ? '#d4edda' : '#f8d7da',
              color: resultText.includes('🎉') ? '#155724' : '#721c24',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${resultText.includes('🎉') ? '#c3e6cb' : '#f5c6cb'}`,
              marginBottom: '15px',
              fontWeight: 'bold'
            }}>
              {isDemoMode && resultText.includes('❌') ? "❌ Демо-режим: выигрыши отключены" : resultText}
            </div>
          )}

          {/* Кнопка сообщить админу при выигрыше в реальном режиме */}
          {wonGift && !isDemoMode && (
            <button 
              onClick={() => sendWinNotification(wonGift)}
              style={{
                padding: '10px 15px',
                background: 'linear-gradient(145deg, #28a745, #20c997)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                width: '100%',
                marginBottom: '15px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
              }}
            >
              📨 Сообщить админу о выигрыше
            </button>
          )}
        </div>

        {/* Игра в кости */}
        <div style={{ 
          width: '100%',
          background: '#f8f9fa',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '20px',
          border: '2px solid #e9ecef',
          boxSizing: 'border-box'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px', textAlign: 'center', color: '#007bff' }}>
            🎲 Кости
          </div>
          
          {/* Ставки на числа */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', textAlign: 'center', color: '#495057' }}>Сделайте ставки:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '15px' }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(number => (
                <div key={number} style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  padding: '8px',
                  border: `2px solid ${bets[number-1] > 0 ? '#28a745' : '#dee2e6'}`,
                  textAlign: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px', color: '#007bff', fontSize: '14px' }}>{number}</div>
                  <div style={{ fontSize: '11px', color: '#ff6a00', marginBottom: '3px' }}>
                    x{odds[number-1].toFixed(1)}
                  </div>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px', color: '#28a745', fontSize: '12px' }}>
                    {bets[number-1]} ⭐️
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '3px' }}>
                    <button 
                      onClick={() => updateBet(number, -1)}
                      disabled={bets[number-1] <= 0}
                      style={{
                        padding: '2px 6px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: bets[number-1] <= 0 ? 'not-allowed' : 'pointer',
                        fontSize: '10px'
                      }}
                    >
                      -
                    </button>
                    <button 
                      onClick={() => updateBet(number, 1)}
                      disabled={!isDemoMode && balance <= 0}
                      style={{
                        padding: '2px 6px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: (!isDemoMode && balance <= 0) ? 'not-allowed' : 'pointer',
                        fontSize: '10px'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{ fontWeight: 'bold', color: '#007bff', fontSize: '14px' }}>
                Общая ставка: {totalBet} ⭐️
              </div>
              <button 
                onClick={clearBets}
                disabled={totalBet === 0}
                style={{
                  padding: '4px 8px',
                  background: totalBet === 0 ? '#6c757d' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: totalBet === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '11px'
                }}
              >
                Очистить
              </button>
            </div>
          </div>
          
          {/* Отображение кубика */}
          <div style={{
            width: '60px',
            height: '60px',
            margin: '0 auto 15px',
            background: '#ffffff',
            borderRadius: '8px',
            border: '2px solid #007bff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#007bff',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}>
            {diceValue}
          </div>
          
          {/* История бросков */}
          {diceHistory.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px', textAlign: 'center', color: '#495057', fontSize: '14px' }}>Последные броски:</div>
              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {diceHistory.map((value, index) => (
                  <div key={index} style={{
                    width: '25px',
                    height: '25px',
                    background: '#007bff',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: 'white',
                    border: '1px solid #0056b3',
                    fontSize: '12px'
                  }}>
                    {value}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Кнопка броска */}
          <button
            onClick={rollDice}
            disabled={isRolling || totalBet === 0}
            style={{
              padding: '12px',
              background: isRolling || totalBet === 0 ? '#6c757d' : (isDemoMode ? '#28a745' : 'linear-gradient(145deg, #ff6a00, #ff9a00)'),
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              cursor: isRolling || totalBet === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
              marginBottom: '15px',
              width: '100%',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              boxSizing: 'border-box'
            }}
          >
            {isRolling ? '🎲 Бросаем...' : totalBet === 0 ? 'Сделайте ставку' : (isDemoMode ? '🎲 Бесплатный бросок' : 'Бросить кости')}
          </button>

          {diceResultText && (
            <div style={{
              background: diceResultText.includes('выиграли') || diceResultText.includes('Демо-выигрыш') ? '#d4edda' : '#f8d7da',
              color: diceResultText.includes('выиграли') || diceResultText.includes('Демо-выигрыш') ? '#155724' : '#721c24',
              padding: '10px',
              borderRadius: '8px',
              border: `1px solid ${diceResultText.includes('выиграли') || diceResultText.includes('Демо-выигрыш') ? '#c3e6cb' : '#f5c6cb'}`,
              fontWeight: 'bold',
              textAlign: 'center',
              fontSize: '14px'
            }}>
              {diceResultText}
            </div>
          )}
        </div>

        {/* Список доступных подарков по рулеткам */}
        <div style={{ 
          width: '100%',
          background: '#f8f9fa',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '20px',
          border: '2px solid #e9ecef',
          boxSizing: 'border-box'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px', textAlign: 'center', color: '#007bff' }}>
            🎁 Доступные подарки
          </div>
          
          {roulettes.map((roulette, index) => {
            // Фильтруем только реальные подарки (исключаем проигрыш с id: 0)
            const realGifts = roulette.gifts.filter(gift => gift.id !== 0);
            
            return (
              <div key={index} style={{ marginBottom: '20px' }}>
                <div style={{ 
                  background: 'linear-gradient(145deg, #007bff, #0056b3)',
                  color: '#ffffff',
                  padding: '10px 15px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  textAlign: 'center'
                }}>
                  {roulette.name} - {roulette.cost} ⭐️
                </div>
                
                {realGifts.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {realGifts.map((gift, giftIndex) => (
                      <div key={giftIndex} style={{
                        background: '#ffffff',
                        borderRadius: '8px',
                        padding: '10px',
                        border: '2px solid #007bff',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '5px' }}>{gift.image}</div>
                        <div style={{ fontWeight: 'bold', color: '#007bff', fontSize: '14px' }}>{gift.name}</div>
                        <div style={{ color: '#28a745', fontSize: '12px' }}>{gift.stars} ⭐️</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    background: '#ffffff', 
                    padding: '15px', 
                    borderRadius: '8px', 
                    border: '2px solid #dc3545',
                    textAlign: 'center',
                    color: '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    Нет доступных подарков в этой рулетке
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
 
export default GiftBattle;