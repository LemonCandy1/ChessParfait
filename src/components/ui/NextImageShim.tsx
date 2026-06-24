import React from 'react';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  width?: number | string;
  height?: number | string;
}

export default function Image({ width, height, ...props }: ImageProps) {
  return <img width={width} height={height} {...props} />;
}
