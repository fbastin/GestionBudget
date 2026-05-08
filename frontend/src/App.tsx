import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ActifsPassifs } from "./pages/ActifsPassifs";
import { Banques } from "./pages/Banques";
import { Credits } from "./pages/Credits";
import { RegisteredAccount } from "./pages/RegisteredAccount";
import { Investissements } from "./pages/Investissements";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ActifsPassifs />} />
          <Route path="/investissements" element={<Investissements />} />
          <Route path="/banques" element={<Banques />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="/celi" element={<RegisteredAccount type="CELI" />} />
          <Route path="/reer" element={<RegisteredAccount type="REER" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
