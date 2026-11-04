# Тарих Race KZ · GAME HUB CYB26-01

Қазақстан тарихына негізделген браузерлік жарыс ойыны (Racing + Quiz) және топтың ортақ ойын порталы.

**Сайт:** https://islamissa-101.github.io/tarih-race-kz/
**Команда:** Ислам Иссаев · Саяжан Дуйсебай · Али Жасар · Ануар Киябаев

## Архитектура

```
Браузер (HTML5 Canvas, JavaScript)
   │  publishable key + қолданушы JWT, тек HTTPS
   ▼
Supabase Auth (Google OAuth 2.0, PKCE)        Supabase Edge Functions
                                                 start-race    — жарыс бастау, сұрақтарды ЖАУАПСЫЗ беру
                                                 submit-answer — жауапты серверде тексеру
                                                 finish-race   — ұпайды серверде есептеу, рейтинг
                                                    │ secret key (тек серверде)
                                                    ▼
                                    PostgreSQL + Row Level Security
                                    profiles · questions · races · race_answers · leaderboard
GitHub → GitHub Pages (HTTPS)
```

## Файлдар

| Жол | Не |
| --- | --- |
| `index.html`, `assets/hub.js` | GAME HUB: кіру, ойындар тізімі, рейтинг, профиль, нәтижелер, админ, рейтинг жүйесі |
| `race/index.html`, `assets/race.js` | Ойын: псевдо-3D жарыс қозғалтқышы, тарихи кедергілер, «Жан біткенде» механикасы |
| `assets/api.js` | Supabase клиенті, Edge Functions шақыру |
| `assets/config.js` | Ашық конфигурация (URL және publishable key) |
| `supabase/schema.sql` | Кестелер, RLS саясаттары, сұрақтар базасы |
| `supabase/functions/*` | Үш серверлік функция |

## Киберқауіпсіздік

- **Google OAuth 2.0 + PKCE**, сессияны Supabase Auth басқарады; әр серверлік сұраныста JWT тексеріледі.
- **Row Level Security** барлық кестеде қосулы. `questions` кестесі клиентке жабық — дұрыс жауаптар браузерге түспейді.
- **Leaderboard manipulation-нан қорғау:** клиент ұпай жібермейді. Ұпайды `finish-race` сервердегі жауаптар журналынан есептейді; монета, өмір және уақыт сервердің шегімен шектеледі; трассаны 35 секундтан жылдам өту қабылданбайды; бір жарыс бір рет қана аяқталады.
- **Input validation:** сервер әр өрістің типін және ұзындығын тексереді; профиль атауы дерекқордағы CHECK шектеуімен де тексеріледі; клиент тек `display_name` бағанын өзгерте алады (column grant).
- **XSS:** барлық мәтін `textContent` арқылы шығады; Content-Security-Policy тек өз скрипттерімізге және Supabase-ке рұқсат береді.
- **Құпиялар:** сайтта тек ашық publishable key бар. Secret key тек Edge Functions ортасында. `.gitignore` + GitHub Push protection.
- **Rate limiting:** 15 секундта бір жарыс, минутына 30 жауап.
- **HTTPS:** GitHub Pages «Enforce HTTPS», CORS тек сайттың доменіне ашық.

## Ұпай

`дұрыс жауап × 100 + монета × 5 + (мәреге жетсе) қалған өмір × 100 + 3 минуттан жылдам әр секунд × 5`

## Неліктен бұл алгоритм

1. **Білім = жылдамдық:** дұрыс жауап жарыста тікелей артықшылық береді.
2. **Лейтнер жүйесі:** қате берілген сұрақ екі кедергіден кейін қайта шығады.
3. **Хронология = трасса:** дәуірлер ретімен өтіледі.
