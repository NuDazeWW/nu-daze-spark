import { useLocation } from "react-router-dom";
import { LocalNav } from "./LocalNav";
import headerBirdUrl from "@/assets/brand/socialmotive-header-bird.png";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  linksMenu?: boolean;
}

/** A dark command header independent of the page body's reading surface. */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  const { pathname } = useLocation();
  const showArt = pathname !== "/";
  return (
    <div className="sm-page-header sm-unified-header sm-dark mb-6">
      <div className="sm-page-title-row flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-foreground break-words">{title}</h1>
          {description && <p className="sm-page-subtitle mt-1">{description}</p>}
        </div>
        {showArt && (
          <div className="sm-header-art sm-dash-art" aria-hidden="true">
            <img src={headerBirdUrl} alt="" className="sm-dash-bird" />
            <p className="sm-dash-tagline">Turn strategy<br />into <span className="sm-dash-em-cyan">social</span> <span className="sm-dash-em-lime">momentum.</span></p>
          </div>
        )}
      </div>
      <LocalNav />
      {children && <div className="sm-page-actions mt-4 flex items-center gap-2">{children}</div>}
    </div>
  );
}
