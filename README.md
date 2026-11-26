# Vbe Matematikos Laboratorija

I need a Lithuanian web app called "VBE uždavinių generatorius". It uses AI to generate VBE mathematics tasks (bendrasis kursas B and išplėstinis kursas A) with checked answers and step-by-step solutions. Students practise on screen; tutors print worksheets and mock exams. The app must look and feel like a real VBE exam paper: black on white, strictly structured, exam typography. All UI text, tasks and solutions are in Lithuanian.

Start with step 1:
1) design system (exam look), layout, pages, config files (src/config/topics.ts and src/config/examTemplates.ts), and mock data so the app runs cleanly and all views can be navigated and inspected.

Attached files:
- I need a Lithuanian web app called VBE (pasted).md (full specifications)
- vbe_example_tasks.json (57 real VBE II dalis tasks)

Admin email: austejaona@gmail.com

Full prompt specification:
## Context
Two generation modes:
1. Teminis rinkinys: kursas (B/A), one or more topics (or a whole area with one click), pobūdis (Skaičiavimo / Tekstinis (realaus turinio) / Mišrus), kiekis (1–10). Tasks are open-answer (short, or structured with parts).
2. Bandomasis egzaminas: kursas (B/A) and dalis (I/II). The app builds a full exam from the templates below.
Every generated set is saved to the user's history and can be reopened and printed.

## Tech stack
- React + TypeScript + Tailwind + shadcn/ui.
- Lovable Cloud: email/password and Google login, database, edge functions. Lovable AI for all model calls, only inside edge functions.
- Tasks are Markdown with LaTeX ($...$ inline, $$...$$ display), rendered with react-markdown + remark-gfm + remark-math + rehype-katex + KaTeX CSS.
- Topics and exam templates live in src/config/topics.ts and src/config/examTemplates.ts so I can edit them.

## Pages
- /prisijungti: login and sign-up. All other pages require login.
- /generuoti (home): tabs "Teminis rinkinys" and "Bandomasis egzaminas" with the inputs above and a "Generuoti" button. While generating, show "Generuojama 7 / 20" and render tasks on the sheet as they arrive.
- /rinkinys/:id: the set as an exam sheet (see Design). Under each task: collapsible "Rodyti atsakymą" and "Rodyti sprendimą", a "Nepatikrinta" label when the check failed, and "Generuoti iš naujo" for that task. Toolbar above the sheet: editable title, "Spausdinti užduotis", "Spausdinti su sprendimais".
- /mano-rinkiniai: my saved sets as a ruled table (title, date, kursas, mode) with open, rename, delete.
- /admin/pavyzdziai (admins only): list, add, edit and delete example tasks with a live preview on the sheet.
Top bar: app name on the left; Generuoti, Mano rinkiniai, Pavyzdžiai (admins only), Atsijungti on the right; a double black rule underneath.

## Design: like a VBE exam paper
- Black (#000) on white (#FFF) only; greys (#666, #DDD) just for secondary text and dividers. No colours, gradients, shadows or rounded corners (radius 0 for all shadcn components).
- Fonts: Arial/Helvetica for text, KaTeX for math, Times New Roman for section titles and uppercase rule lines.
- A set is shown as an A4-like sheet (max 800 px wide, white, thin black border, generous margins):
  - running header: set title on the left, "Bendrasis kursas" or "Išplėstinis kursas" on the right, double black rule underneath;
  - mock exams start with a cover block: "MATEMATIKA", "VBE II dalies treniruotės variantas" (or I dalies), kursas, date, "Trukmė – 4 val. (240 min.)" or "Trukmė – 2 val. (120 min.)", total points;
  - section titles centred and bold ("I dalis", "II dalis") with an italic instruction line, e.g. "Kiekvieno šios dalies uždavinio (1–10) teisingas atsakymas vertinamas 1 tašku.";
  - task numbers in bold ("11.", parts "11.1."), points right-aligned in italics, e.g. "(2 taškai)", with correct Lithuanian forms (1 taškas, 2–9 taškai, 10–20 taškų, 21 taškas …);
  - MCQ options in one row: A …   B …   C …   D …;
  - tables with full black grid lines;
  - footer: double rule and a centred uppercase line in Times New Roman.
- Buttons: primary = black fill, white text; secondary = white with 1 px black border; hover inverts. Inputs: 1 px black border, no radius. Small uppercase labels.
- Mobile first: on small screens the sheet goes full width with the same typography.
- Never use the NŠA name or logo; generated sheets are labelled "Generuotas treniruotės variantas".

## Database (RLS on every table)
- task_sets: id, user_id, title, mode ('topic'|'mock'), course ('B'|'A'), exam_part ('I'|'II'|null), settings jsonb, total_points, created_at. Owner-only.
- tasks: id, set_id, position, label, format ('mcq'|'short'|'full'), topic, points, statement, options jsonb, parts jsonb ([{label, statement, points}]), answer jsonb, solution jsonb ([{text, points}]), verified boolean, attempts int. Owner-only through the set.
- example_tasks: id, course, exam_part, topic, format, points, statement, parts jsonb, answer jsonb, solution jsonb, source. Seeded from the attached JSON; read by edge functions; edited by admins only.
- user_roles: user_id, role ('admin'). Make austejaona@gmail.com an admin.
- Limit: 100 generated tasks per user per day (constant in config). Show the remaining count and a friendly message when it is reached.

## Topics (NŠA 11–12 kl. turinio minimumas; (A) = išplėstinis only)
11 kl., Skaičiai ir skaičiavimai: Skaičių aibės; Realiojo skaičiaus modulis; Šaknys; Laipsnis su racionaliuoju rodikliu; Logaritmai; Sinusas, kosinusas ir tangentas.
11 kl., Modeliai ir sąryšiai: Progresijos; Funkcijos; Lygtys; Nelygybės; Vektoriai (A).
12 kl., Modeliai ir sąryšiai: Trigonometrinės lygtys ir nelygybės; Funkcijos išvestinė; Pirmykštė funkcija ir integralas (A).
12 kl., Geometrija ir matavimai: Tiesės, plokštumos, kampai erdvėje; Briaunainiai, sukiniai.
12 kl., Duomenys ir tikimybės: Rinkiniai (kėliniai, gretiniai, deriniai) ir tikimybės; Atsitiktiniai dydžiai.

## Mock exam templates (NŠA VBE aprašas 2026)
I dalis (B and A): 30 tasks, 40 points, 120 min, 11 kl. topics only, about 40% of points from Skaičiai ir skaičiavimai and 60% from Modeliai ir sąryšiai, every 11 kl. topic at least once. Tasks 1–15 MCQ (ten 1-point, five 2-point). Tasks 16–30 short answer (ten 1-point, five 2-point that ask for two values).
II dalis (B and A): 60 points, 240 min, 11–12 kl. topics. Tasks 1–10 short answer, 1 point each, ten different topics. Then full-solution tasks worth 50 points (points per part in brackets):
- B: 11 Lygtys (2, 2, 3, 3); 12 Progresijos, tekstinis (2, 2, 3); 13 Briaunainiai, sukiniai, tekstinis (3, 2, 2); 14 Logaritminė funkcija, realaus turinio modelis (3); 15 Skaičių aibės, tekstinis (3); 16 Funkcijos išvestinė, optimizavimas (2, 1, 3, 2); 17 Rinkiniai ir tikimybės (2, 2, 4); 18 Tiesės, plokštumos, kampai erdvėje (2, 2).
- A: 11 Nelygybės (3, 2, 3); 12 Trigonometrinio reiškinio prastinimas (2); 13 Progresijos, tekstinis (2, 2, 2); 14 Vektoriai (2, 3); 15 Funkcijos išvestinė, optimizavimas (3, 2, 4); 16 Briaunainiai, sukiniai (2, 2); 17 Rinkiniai ir tikimybės (1, 2, 3); 18 Logaritmai, įrodymas (3); 19 Lygtys, tekstinis (4); 20 Tiesės, plokštumos, kampai erdvėje (3).

## Print / PDF
window.print() with print CSS: A4, 2 cm margins, the same sheet design, no app bar or buttons, no page break inside a task, page numbers in the footer.
- "Spausdinti užduotis": cover block (mocks), header, a line for "Vardas, pavardė", tasks with points, and after each full-solution part an italic "Juodraštis" label with blank space.
- "Spausdinti su sprendimais": the same, then on a new page "Atsakymai ir sprendimai" as a table like NŠA's vertinimo instrukcija, with columns "Užd.", "Sprendimas ir atsakymas", "Taškai".

Please build step 1 now: the design system, A4 exam sheet layout, typography, top bar, navigation, configuration files (topics and exam templates), mock data, and key page shells.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dc417a03-840a-4c3a-8433-1604338cd010).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
