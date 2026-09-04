"use client";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { useRef } from "react";
import { Star, Quote } from "lucide-react";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
}

const testimonials: Testimonial[] = [
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
    quote: "My son absolutely loves his chess coaching with Luis. Every class begins with an interesting puzzle that immediately gets him thinking and sets the tone for an engaging lesson. What impresses us most is how well he understands each child and adapts his teaching to keep every session challenging, interactive, and enjoyable.\n\nHe encourages curiosity, critical thinking, and independent problem solving instead of simply teaching moves. My son genuinely looks forward to every lesson because the classes are interactive, thought-provoking, and fun.\n\nHe is an amazing coach with so much knowledge, and his way of teaching inspires kids to enjoy chess and think for themselves. Definitely from us! 👍👍 A well deserved 5/5 stars. We highly recommend him.",
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

function ClientFeedback() {
  const testimonialRef = useRef<HTMLDivElement>(null);

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.45,
        ease: [0.23, 1, 0.32, 1], // Emil's signature --ease-out curve
        delay: i * 0.08,
      },
    }),
    hidden: {
      y: 24,
      scale: 0.98,
      opacity: 0,
    },
  };

  return (
    <div className="w-full bg-cream/30 border-b border-plum/5 py-24 z-10 relative">
      <section className="relative h-full max-w-7xl mx-auto px-6 md:px-12" ref={testimonialRef}>
        <article className="max-w-3xl text-left space-y-3 mb-16">
          <TimelineContent as="h2" className="text-4xl md:text-5xl font-black tracking-tight text-plum" animationNum={0} customVariants={revealVariants} timelineRef={testimonialRef}>
            Student Reviews & Coaching Highlights
          </TimelineContent>
          <TimelineContent as="p" className="text-lg text-plum/75 font-medium leading-relaxed" animationNum={1} customVariants={revealVariants} timelineRef={testimonialRef}>
            See how student players refined their chess intuition and broke rating plateaus under FM Luis Chan's guidance.
          </TimelineContent>
        </article>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full pb-4">
          {testimonials.map((t, index) => {
            const isEven = index % 2 === 0;
            const cardBg = isEven ? "bg-plum border-plum/20" : "bg-berry border-berry/20";
            const badgeBg = isEven ? "bg-berry" : "bg-plum";

            return (
              <TimelineContent
                key={index}
                animationNum={2 + index}
                customVariants={revealVariants}
                timelineRef={testimonialRef}
                whileHover={{ y: -4, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}
                className={`flex flex-col justify-between relative ${cardBg} text-cream overflow-hidden rounded-[2.5rem] border p-8 shadow-xl min-h-[250px] transition-shadow duration-200 hover:shadow-2xl`}
              >
                <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:50px_56px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none"></div>

                <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <Quote className="text-white/10 w-8 h-8 transform -scale-x-100" />
                  </div>

                  <p className="text-base md:text-lg leading-relaxed text-cream/95 font-medium italic whitespace-pre-line">
                    "{t.quote}"
                  </p>

                  <div className="pt-4 border-t border-white/10 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${badgeBg} flex items-center justify-center font-bold text-sm text-white shadow-md`}>
                      {t.initials}
                    </div>
                    <div>
                      <h3 className="font-serif font-black text-white text-lg leading-tight">{t.name}</h3>
                      <p className="text-xs text-cream/85 font-bold uppercase tracking-wider mt-0.5">{t.role}</p>
                    </div>
                  </div>
                </div>
              </TimelineContent>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default ClientFeedback;
