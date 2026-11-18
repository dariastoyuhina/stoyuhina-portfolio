/* Extends shared/i18n.js with the strings of the designed site.
   Her original copy (cases, traits, CV, achievements) is reused untouched. */
(function () {
  "use strict";
  var I = window.PORTFOLIO_I18N;

  I.ru.brand = "Даша Стоюхина";
  I.ru.nav = {
    cases: "Кейсы",
    about: "Обо мне",
    experience: "Опыт",
    awards: "Награды",
    contact: "Контакты",
  };
  I.ru.hero = {
    eyebrow: "Давайте познакомимся?",
    title: ["я Даша Стоюхина", "Senior UX/UI дизайнер", "и арт-директор"],
    lead: [
      "Создаю и проектирую цифровые продукты на протяжении 6-ти лет.",
      "Работала с Яндексом, Сбером и Уралсибом, проектирую дизайн",
      "с учетом пользовательских потребностей и целей команды",
    ],
    primary: "Связаться",
    secondary: "Посмотреть резюме",
    resumeUrl: "https://drive.google.com/file/d/1dtvG4lhvJIFnrT7dEGy3mPZM46ilcKvS/view?usp=sharing",
  };
  I.ru.ui = {
    skip: "Перейти к содержанию",
    menu: "Меню",
    prev: "Предыдущий слайд",
    next: "Следующий слайд",
    slide: "Слайд",
    screen: "screen",
    cvLabel: "Места работы",
  };
  I.ru.sim = {
    label: "симулятор дизайнера",
    title: "Один день дизайнера",
    rules: "Кликай по полю, и я направлюсь туда. Хватай идеи, пей кофе, общайся с юзерами, вноси правки, пока они не сгорели, и собери макет до релиза",
    start: "Начать день",
    again: "Еще один день",
    mood: "настроение",
    layout: "макет",
    idea: "+идея",
    fix: "правки внесены",
    coffee: "+кофе",
    like: "+инсайт из интервью",
    burn: "правки сгорели",
    winTitle: "Релиз!",
    win: "Макет сдан, команда счастлива. Время: {t} сек",
    loseTitle: "Выгорание",
    lose: "Даже дизайнеру нужен отдых. Попробуем еще раз?",
  };
  I.ru.ach = { kicker: "достижение получено" };
  I.ru.room = {
    spots: { pc: "Компьютер", pets: "Питомцы", window: "Окно", games: "Игровые диски", poster: "Плакат" },
    bubbles: {
      hint: "привет! это моя комната. можешь здесь осмотреться, нажав на кружки",
      pc: "уже 6 лет занимаюсь дизайном. много работаю и учусь. когда я последний раз выключала ноутбук?",
      pets: "я большой любитель животных. а это два моих питомца - Бетман и Эвик",
      window: "сейчас я живу в Армении с видом на горы. но готова к переезду в новое место",
      games:
        "я фанат компьютерных игр. моя любимая это the last of us 1. увлекаюсь играми с 9 лет, когда папа купил мне первую. это хобби очень помогает мне в работе",
      poster: "я очень эмпатичный человек, это помогает мне в UX-исследованиях",
    },
  };
  I.ru.contacts = {
    title: "Мои контакты",
    bubble: "Буду рада знакомству с вами!",
    items: [
      { kind: "Email", value: "dariastoyuhina@gmail.com", href: "mailto:dariastoyuhina@gmail.com", icon: "mail" },
      { kind: "LinkedIn", value: "linkedin.com/in/varimur-design", href: "https://www.linkedin.com/in/varimur-design", icon: "search" },
      { kind: "Телефон", value: "+374 41 240699", href: "tel:+37441240699", icon: "phone" },
      { kind: "Telegram личный", value: "t.me/dariasto", href: "https://t.me/dariasto", icon: "smile" },
      { kind: "Telegram блог", value: "t.me/varimur_design", href: "https://t.me/varimur_design", icon: "owl" },
      { kind: "Instagram блог", value: "instagram.com/varimur_design", href: "https://www.instagram.com/varimur_design/", icon: "camera" },
    ],
  };

  I.en.brand = "Dasha Stoyukhina";
  I.en.nav = {
    cases: "Cases",
    about: "About",
    experience: "Experience",
    awards: "Awards",
    contact: "Contact",
  };
  I.en.hero = {
    eyebrow: "Let's get acquainted?",
    title: ["I'm Dasha Stoyukhina", "Senior UX/UI designer", "and art director"],
    lead: [
      "I've been creating and designing digital products for 6 years.",
      "I've worked with Yandex, Sber and Uralsib, and design",
      "around user needs and team goals",
    ],
    primary: "Get in touch",
    secondary: "View résumé",
    resumeUrl: "https://drive.google.com/file/d/1RACIWzwWR_dGw95GYkD9j-tb8nx-Qa9x/view?usp=sharing",
  };
  I.en.ui = {
    skip: "Skip to content",
    menu: "Menu",
    prev: "Previous slide",
    next: "Next slide",
    slide: "Slide",
    screen: "screen",
    cvLabel: "Workplaces",
  };
  I.en.sim = {
    label: "designer simulator",
    title: "A designer's day",
    rules: "Click anywhere and I'll head there. Grab ideas, drink coffee, talk to users, make edits before they burn, and ship the layout before the release",
    start: "Start the day",
    again: "One more day",
    mood: "mood",
    layout: "layout",
    idea: "+idea",
    fix: "edits closed",
    coffee: "+coffee",
    like: "+interview insight",
    burn: "edits burned",
    winTitle: "Shipped!",
    win: "Layout delivered, the team is happy. Time: {t} s",
    loseTitle: "Burnout",
    lose: "Even designers need rest. Try again?",
  };
  I.en.ach = { kicker: "achievement unlocked" };
  I.en.room = {
    spots: { pc: "Computer", pets: "Pets", window: "Window", games: "Game discs", poster: "Poster" },
    bubbles: {
      hint: "hi! this is my room. look around by clicking the circles",
      pc: "6 years in design already. i work and study a lot. when did i last turn off my laptop?",
      pets: "i'm a huge animal lover. and these are my two pets - Batman and Evik",
      window: "right now i live in Armenia with a view of the mountains. but i'm ready to move to a new place",
      games:
        "i'm a video game fan. my favorite is the last of us 1. i've been into games since i was 9, when my dad bought me my first one. this hobby really helps me at work",
      poster: "i'm a very empathetic person, it helps me in UX research",
    },
  };
  I.en.contacts = {
    title: "My contacts",
    bubble: "Happy to meet you!",
    items: [
      { kind: "Email", value: "dariastoyuhina@gmail.com", href: "mailto:dariastoyuhina@gmail.com", icon: "mail" },
      { kind: "LinkedIn", value: "linkedin.com/in/varimur-design", href: "https://www.linkedin.com/in/varimur-design", icon: "search" },
      { kind: "Phone", value: "+374 41 240699", href: "tel:+37441240699", icon: "phone" },
      { kind: "Telegram personal", value: "t.me/dariasto", href: "https://t.me/dariasto", icon: "smile" },
      { kind: "Telegram blog", value: "t.me/varimur_design", href: "https://t.me/varimur_design", icon: "owl" },
      { kind: "Instagram blog", value: "instagram.com/varimur_design", href: "https://www.instagram.com/varimur_design/", icon: "camera" },
    ],
  };
})();
