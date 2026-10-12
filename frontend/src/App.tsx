import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ActifsPassifs } from "./pages/ActifsPassifs";
import { Depenses } from "./pages/Depenses";
import { Paiements } from "./pages/Paiements";
import { Banques } from "./pages/Banques";
import { Credits } from "./pages/Credits";
import { RegisteredAccount } from "./pages/RegisteredAccount";
import { Investissements } from "./pages/Investissements";

// Prefix of the app's URLs: "/budget" once deployed on slashbin.net (see deploy_slashbin.sh), none locally
const ROUTER_BASENAME = import.meta.env.VITE_ROUTER_BASENAME || undefined;

function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ActifsPassifs />} />
          <Route path="/depenses" element={<Depenses />} />
          <Route path="/paiements" element={<Paiements />} />
          <Route path="/investissements" element={<Investissements />} />
          <Route path="/banques" element={<Banques />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="/celi" element={<RegisteredAccount key="CELI" type="CELI" />} />
          <Route path="/reer" element={<RegisteredAccount key="REER" type="REER" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
