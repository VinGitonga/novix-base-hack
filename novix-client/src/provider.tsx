import type { NavigateOptions } from "react-router";
import { RouterProvider } from "react-router";
import router from "./router";

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

function Provider() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default Provider;
