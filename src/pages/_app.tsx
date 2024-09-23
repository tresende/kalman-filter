import '../styles/global.css'
import { AppProps } from 'next/dist/shared/lib/router/router'

const App = ({ Component, pageProps }: AppProps) => <Component {...pageProps} />

export default App
