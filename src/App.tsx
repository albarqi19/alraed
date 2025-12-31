import { AppProviders } from './app/providers/app-providers'
import { AppRouter } from './app/router/app-router'
import { UpdateBanner } from './shared/components/UpdateBanner'

function App() {
  return (
    <AppProviders>
      <UpdateBanner />
      <AppRouter />
    </AppProviders>
  )
}

export default App
