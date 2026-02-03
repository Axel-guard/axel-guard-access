import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Employee {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export const useEmployees = () => {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      
      // Remove duplicates by name - keep only the first occurrence of each name
      const uniqueEmployees = (data as Employee[]).reduce((acc, emp) => {
        const existingIndex = acc.findIndex(e => e.name.toLowerCase() === emp.name.toLowerCase());
        if (existingIndex === -1) {
          acc.push(emp);
        }
        return acc;
      }, [] as Employee[]);
      
      return uniqueEmployees;
    },
  });
};
