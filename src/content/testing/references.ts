// Test-only solution choices and tempting alternatives, in campaign order.
export const references = [
  {
    id: "w1-l1-needle-in-a-million",
    winning: ["idx_users_email"],
    losing: ["idx_users_name"],
  },
  {
    id: "w1-l2-name-collision",
    winning: ["idx_contacts_name"],
    losing: ["idx_contacts_email"],
  },
];
