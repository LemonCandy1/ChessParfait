"use client";
import { TimelineContent } from "@/components/ui/timeline-animation";
import Image from "next/image";
import { useRef } from "react";

function ClientFeedback() {
    const testimonialRef = useRef<HTMLDivElement>(null);
  
    const revealVariants = {
      visible: (i: number) => ({
        y: 0,
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        transition: {
          type: "spring",
          stiffness: 100,
          damping: 15,
          delay: i * 0.1,
          duration: 0.5,
        },
      }),
      hidden: {
        filter: "blur(10px)",
        y: 30,
        scale: 0.9,
        opacity: 0,
      },
    };
  
  return (
    <div className="w-full bg-cream/30 border-b border-plum/5 py-24 z-10 relative">
      <section className="relative h-full max-w-7xl mx-auto px-6 md:px-12" ref={testimonialRef}>
        <article className="max-w-3xl text-left space-y-4 mb-16" >
          <TimelineContent as="span" className="text-[10px] font-black bg-berry/10 text-berry border border-berry/20 px-3.5 py-1 rounded-full uppercase tracking-widest inline-block" animationNum={0} customVariants={revealVariants} timelineRef={testimonialRef}>
            Student Success
          </TimelineContent>
          <TimelineContent as="h2" className="text-4xl md:text-5xl font-black tracking-tight text-plum" animationNum={1} customVariants={revealVariants} timelineRef={testimonialRef}>
            Reviews from the Coaching Sessions
          </TimelineContent>
          <TimelineContent as="p" className="text-lg text-plum/60 font-medium leading-relaxed" animationNum={2} customVariants={revealVariants} timelineRef={testimonialRef}>
            See how student players refined their chess intuition and broke rating plateaus under FM Luis Chan's guidance.
          </TimelineContent>
        </article>
        
        <div className="lg:grid lg:grid-cols-3 gap-6 flex flex-col w-full pb-4">
          <div className="md:flex lg:flex-col lg:space-y-6 h-full lg:gap-0 gap-6 ">
            <TimelineContent animationNum={3} customVariants={revealVariants} timelineRef={testimonialRef} className="lg:flex-[7] flex-[6] flex flex-col justify-between relative bg-plum text-cream overflow-hidden rounded-[2.5rem] border border-plum/20 p-8 shadow-xl min-h-[200px]">
              <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:50px_56px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
            </TimelineContent>
            
            <TimelineContent animationNum={4} customVariants={revealVariants} timelineRef={testimonialRef} className="lg:flex-[3] flex-[4] lg:h-fit lg:shrink-0 flex flex-col justify-between relative bg-berry text-cream overflow-hidden rounded-[2.5rem] border border-berry/20 p-8 shadow-lg min-h-[150px]">
            </TimelineContent>
          </div>
          
          <div className="lg:h-full md:flex lg:flex-col h-fit lg:space-y-6 lg:gap-0 gap-6">
            <TimelineContent animationNum={5} customVariants={revealVariants} timelineRef={testimonialRef} className="flex flex-col justify-between relative bg-white/60 backdrop-blur-md text-plum overflow-hidden rounded-[2.5rem] border border-plum/10 p-8 shadow-md hover:shadow-xl transition-all hover:bg-white/80 min-h-[150px]">
            </TimelineContent>
            
            <TimelineContent animationNum={6} customVariants={revealVariants} timelineRef={testimonialRef} className="flex flex-col justify-between relative bg-white/60 backdrop-blur-md text-plum overflow-hidden rounded-[2.5rem] border border-plum/10 p-8 shadow-md hover:shadow-xl transition-all hover:bg-white/80 min-h-[150px]">
            </TimelineContent>
            
            <TimelineContent animationNum={7} customVariants={revealVariants} timelineRef={testimonialRef} className="flex flex-col justify-between relative bg-white/60 backdrop-blur-md text-plum overflow-hidden rounded-[2.5rem] border border-plum/10 p-8 shadow-md hover:shadow-xl transition-all hover:bg-white/80 min-h-[150px]">
            </TimelineContent>
          </div>
          
          <div className="h-full md:flex lg:flex-col lg:space-y-6 lg:gap-0 gap-6">
            <TimelineContent animationNum={8} customVariants={revealVariants} timelineRef={testimonialRef} className="lg:flex-[3] flex-[4] flex flex-col justify-between relative bg-berry text-cream overflow-hidden rounded-[2.5rem] border border-berry/20 p-8 shadow-lg min-h-[150px]">
            </TimelineContent>
            
            <TimelineContent animationNum={9} customVariants={revealVariants} timelineRef={testimonialRef} className="lg:flex-[7] flex-[6] flex flex-col justify-between relative bg-plum text-cream overflow-hidden rounded-[2.5rem] border border-plum/20 p-8 shadow-xl min-h-[200px]">
              <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:50px_56px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
            </TimelineContent>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ClientFeedback;
