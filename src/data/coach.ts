// Facts about the coach and the coaching service. Used by the pages and structured data.
// Update here, not in individual pages. public/llms.txt repeats these facts: keep it in sync.

export const SITE_URL = 'https://chessparfait.com';

export const COACH = {
    name: 'Luis Chan',
    title: 'FIDE Master',
    email: 'luischanchess@gmail.com',
    fideRating: 2280,
    acfRating: 2318,
    yearsCoaching: '7+',
    fideProfile: 'https://ratings.fide.com/profile/3216357',
    chessComProfile: 'https://www.chess.com/member/luizzy',
    fogOfWarArticle: 'https://www.chess.com/news/view/2024-chesscom-fog-of-war-chess-championship-knockout-chan-wins',
} as const;

export const LOCATION = {
    suburb: 'Glen Waverley',
    city: 'Melbourne',
    region: 'Victoria',
    regionCode: 'VIC',
    postcode: '3150',
    country: 'AU',
} as const;

export const ACHIEVEMENTS = [
    {
        year: '2026',
        title: 'Board 1 for the University of Melbourne',
        detail: 'FIDE World University Team Chess Championship',
    },
    {
        year: '2021',
        title: 'Represented Australia',
        detail: 'FIDE Online Olympiad',
    },
    {
        year: '2018',
        title: 'FIDE Master title',
        detail: 'Awarded by FIDE, the International Chess Federation',
    },
    {
        year: '5×',
        title: 'Australian Schools Teams Champion',
        detail: '2014, 2015, 2016, 2019 and 2020',
    },
];

export const COACHING_FAQ = [
    {
        question: 'Where do you offer chess lessons?',
        answer: 'I am based in Glen Waverley, Victoria. I offer home visits in and around Glen Waverley, chess coaching for schools, and online lessons for students anywhere.',
    },
    {
        question: 'Do you teach complete beginners?',
        answer: 'Yes. I coach players from their very first moves all the way to competitive tournament level, and my students have gone on to reach 2000+ FIDE ratings.',
    },
    {
        question: 'Can lessons be online?',
        answer: 'Yes. Online lessons cover the same material as in-person sessions, so you can learn from anywhere in Melbourne, Australia or overseas.',
    },
    {
        question: 'Do you run chess coaching for schools?',
        answer: 'Yes. I coach chess in schools. Get in touch to talk about a program for your school.',
    },
    {
        question: 'How do I book a lesson or ask about prices?',
        answer: `Send a message through the contact page or email ${COACH.email}. I will reply with my availability and current rates.`,
    },
    {
        question: 'Who is FM Luis Chan?',
        answer: `Luis Chan is a FIDE Master (2018) with a FIDE rating of ${COACH.fideRating}. He represented Australia at the 2021 FIDE Online Olympiad, played board 1 for the University of Melbourne at the 2026 FIDE World University Team Chess Championship, and won the 2024 Chess.com Fog of War Championship. He has over 7 years of coaching experience.`,
    },
];
