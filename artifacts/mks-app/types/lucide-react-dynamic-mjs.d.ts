declare module "lucide-react/dynamic.mjs" {
  import * as React from "react";

  export const iconNames: readonly string[];

  export const DynamicIcon: React.ForwardRefExoticComponent<
    {
      name: string;
      size?: number;
      color?: string;
      fallback?: () => React.ReactNode;
      strokeWidth?: number;
      absoluteStrokeWidth?: boolean;
      style?: any;
    } & React.RefAttributes<SVGSVGElement>
  >;
}
