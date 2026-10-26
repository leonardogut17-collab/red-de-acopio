import { Outlet } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export function PublicLayout() {
  return (
    <div className="public-layout">
      <PublicHeader />
      <div className="public-main">
        <Outlet />
      </div>
      <PublicFooter />
    </div>
  );
}
