const config = require(__dirname + '/config.js');
const path = require('path');
const Timr = require('timrjs');
const notifier = require('node-notifier');
const store = require('piggy-bank')(
  path.join(require('os').homedir(), '.tinycarepomodoro.json')
);

function init(box, screen, statsBox) {
  const default_focus_time = config.pomodoro.default_focus_time;
  const default_break_time = config.pomodoro.default_break_time;
  const default_msg = '\nPress s to start and stop a session.';
  let timer;

  box.setData([{
    percent: 100,
    label: default_msg
  }]);

  refreshPomodoroStats();

  function start() {
    timer = Timr(default_focus_time);
    timer.start();
    updateTimer('⏰', timer, 'Focus Session');

    timer.finish(function() {
      notifier.notify({
        title: '🍅  Pomodoro Timer',
        message: 'Take a break!',
        sound: true
      });

      timer = Timr(default_break_time);
      timer.start();
      updateTimer('☕️', timer, 'Take a Break');

      incrementTodaysCount();

      timer.finish(function({percentDone}) {
        notifier.notify({
          title: '🍅  Pomodoro Timer',
          message: 'Break is over. Ready for another session?',
          sound: true
        });

        box.setData([{
          percent: 100,
          label: default_msg
        }]);
        screen.render();
      });
    });
  }

  function updateTimer(emoji, timer, msg) {
    timer.ticker(function({formattedTime, percentDone}) {
      text = ` ${emoji}  ${formattedTime} \n ${msg}`;

      box.setData([{
        percent: 100-percentDone,
        label: text
      }]);

      screen.render();
    });
  }

  function incrementTodaysCount() {
    const today = getToday();
    store.set(today, (store.get(today) || 0) + 1, {overwrite: true});
    refreshPomodoroStats();
  }

  function refreshPomodoroStats() {
    const today = getToday();
    statsBox.setData({
      titles: ['today', 'week'],
      data: [store.get(today) || 0, getWeekPomodoros()]
    });
    screen.render();
  }

  function getToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function getWeekPomodoros() {
    let weekPomodoros = 0;
    for (let i = 0; i < 7; i++) {
      let day = new Date();
      day.setDate(day.getDate()-i);
      let count = store.get(day.toISOString().slice(0, 10)) || 0;
      weekPomodoros += count;
    }
    return weekPomodoros;
  }


  function isRunning() {
    return timer && timer.isRunning();
  }

  function stop() {
    if (timer) {
      timer.stop();
      box.setData([{
        percent: 100,
        label: `Session stopped. \n ${default_msg}`
      }]);
      screen.render();
    }
  }

  return {
    start: start,
    isRunning: isRunning,
    stop: stop
  }
}

module.exports.init = init;
