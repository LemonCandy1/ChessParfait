// Student and parent reviews, shown on the home and coaching pages.
export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
}

export const testimonials: Testimonial[] = [
  {
    quote: "I loved solving interesting puzzles with Luis because they were the perfect brain warm up for every session. I also really enjoyed learning new openings, especially the Jobava London!",
    name: "William Yang",
    role: "Student",
    initials: "WY",
  },
  {
    quote: "I really like the warm-up puzzles that get the brain going, as well as the tips Luis gives which include advice for both on and off the chessboard. He has helped improve my calculation in difficult positions and we have shared many memorable moments in our classes.",
    name: "Leo Xu",
    role: "Student for 2 years",
    initials: "LX",
  },
  {
    quote: "My son absolutely loves his chess coaching with Luis. What impresses us most is how well he understands each child and adapts his teaching to keep every session challenging, interactive, and enjoyable.\n\nHe is an amazing coach with so much knowledge, and his way of teaching inspires kids to enjoy chess and think for themselves. Definitely from us! A well deserved 5/5 stars. We highly recommend him.",
    name: "SV",
    role: "Parent",
    initials: "SV",
  },
  {
    quote: "I really enjoyed learning from Luis. He is a great chess coach who always made lessons interesting and easy to follow. Because of his support and clear teaching, I have become a more thoughtful and solid chess player. I really appreciate his constant attention and knowing what I might need to improve on. I highly recommend Luis because he has helped me achieve chess goals I thought that I could never achieve.",
    name: "Jaden Chi",
    role: "Student for 3.5 years",
    initials: "JC",
  }
];
