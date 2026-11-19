import { Children, cloneElement, createContext, useCallback, useContext } from "react";

// The homepage assembly's registration context. Without a provider (the site
// shell on other pages), AssembleReveal simply renders its child.
export const AssemblyContext = createContext(null);

export function useAssemblyBusy() {
  return useContext(AssemblyContext)?.busy || false;
}

// A slot: attach a ref to the existing node without adding layout wrappers.
export function AssembleReveal({ id, closest, children }) {
  const context = useContext(AssemblyContext);
  const child = Children.only(children);
  const originalRef = child.props.ref;
  const register = context?.register;
  const ref = useCallback(
    (node) => {
      if (typeof originalRef === "function") originalRef(node);
      else if (originalRef) originalRef.current = node;
      register?.(id, closest && node ? node.closest(closest) : node);
    },
    [register, id, closest, originalRef],
  );
  return cloneElement(child, { ref, "data-assembly-id": id });
}

