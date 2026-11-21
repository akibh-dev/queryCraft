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
  { id: "w1-l3-pocket-directory", winning: [], losing: ["idx_regions_code"] },
  {
    id: "w1-l4-range-runner",
    winning: ["idx_scores_points"],
    losing: ["idx_scores_player_id"],
  },
  { id: "w1-l5-the-common-case", winning: [], losing: ["idx_jobs_status"] },
  {
    id: "w1-l6-price-of-an-index",
    winning: ["idx_events_request_id"],
    losing: [
      "idx_events_request_id",
      "idx_events_actor_id",
      "idx_events_category",
    ],
  },
];
