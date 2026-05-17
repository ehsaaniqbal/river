'use client';

import Image from 'next/image';

export function HeroProductScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#030504]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_46%,rgba(232,201,106,0.075),transparent_24%),linear-gradient(90deg,#06110d_0%,#06110d_30%,rgba(6,17,13,0.68)_48%,rgba(3,5,4,0.4)_62%,#030504_100%)]" />
      <div className="hero-product-image absolute -right-[18rem] top-[3.5rem] h-[calc(100%-1rem)] w-[92rem] max-w-none bg-[#030504] [mask-image:linear-gradient(180deg,#000_0%,#000_58%,rgba(0,0,0,0.78)_74%,transparent_98%)] sm:-right-[15rem] lg:-right-[23rem] xl:-right-[17rem] 2xl:-right-[11rem]">
        <Image
          src="/images/river-table.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-contain object-right-top"
        />
      </div>
      <div className="hero-stage-sheen absolute inset-0" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#06110d_0%,#06110d_31%,rgba(6,17,13,0.82)_42%,rgba(6,17,13,0.34)_53%,rgba(6,17,13,0)_66%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[18rem] bg-[linear-gradient(180deg,rgba(6,17,13,0)_0%,rgba(6,17,13,0.34)_66%,#06110d_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_82%_82%,rgba(6,17,13,0)_0%,rgba(6,17,13,0)_46%,rgba(6,17,13,0.18)_76%,rgba(6,17,13,0.44)_100%)]" />
    </div>
  );
}
