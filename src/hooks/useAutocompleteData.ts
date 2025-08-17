import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AutocompleteDataHook {
  customerNames: string[];
  employeeNames: string[];
  basketNames: string[];
  itemNames: string[];
  loadingCustomers: boolean;
  loadingEmployees: boolean;
  loadingBaskets: boolean;
  loadingItems: boolean;
}

export function useAutocompleteData(): AutocompleteDataHook {
  const [customerNames, setCustomerNames] = useState<string[]>([]);
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [basketNames, setBasketNames] = useState<string[]>([]);
  const [itemNames, setItemNames] = useState<string[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingBaskets, setLoadingBaskets] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const { data } = await supabase
          .from("customers")
          .select("name")
          .order("name");
        setCustomerNames(Array.from(new Set((data || []).map(r => r.name).filter(Boolean))));
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoadingCustomers(false);
      }
    };

    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const { data } = await supabase
          .from("employees")
          .select("name")
          .order("name");
        setEmployeeNames(Array.from(new Set((data || []).map(r => r.name).filter(Boolean))));
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoadingEmployees(false);
      }
    };

    const fetchBaskets = async () => {
      setLoadingBaskets(true);
      try {
        const { data } = await supabase
          .from("baskets")
          .select("basket_name")
          .not("basket_name", "is", null)
          .order("basket_name");
        setBasketNames(Array.from(new Set((data || []).map(r => r.basket_name).filter(Boolean))));
      } catch (error) {
        console.error("Error fetching baskets:", error);
      } finally {
        setLoadingBaskets(false);
      }
    };

    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const { data } = await supabase
          .from("bill_items")
          .select("name")
          .order("name");
        setItemNames(Array.from(new Set((data || []).map(r => r.name).filter(Boolean))));
      } catch (error) {
        console.error("Error fetching items:", error);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchCustomers();
    fetchEmployees();
    fetchBaskets();
    fetchItems();
  }, []);

  return {
    customerNames,
    employeeNames,
    basketNames,
    itemNames,
    loadingCustomers,
    loadingEmployees,
    loadingBaskets,
    loadingItems,
  };
}