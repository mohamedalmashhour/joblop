import { adminRoles } from "@rwos/auth";

export default function AdminHome() {
  return (
    <main style={{ fontFamily: "Inter, system-ui, sans-serif", padding: 32 }}>
      <p style={{ color: "#607276", textTransform: "uppercase" }}>Foundation shell</p>
      <h1>Resident Workforce OS Admin</h1>
      <p>No admin workflows are implemented. G06 is the approved future group.</p>
      <p>Configured role shells: {adminRoles.join(", ")}</p>
    </main>
  );
}
