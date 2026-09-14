import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ja">
      <Head>
        {/* Tailwind CSS (CDN) */}
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                theme: {
                  extend: {
                    colors: {
                      vintage: {
                        dark: '#0e1117',
                        card: '#161b22',
                        neonPink: '#ff2a75',
                        neonCyan: '#00f0ff',
                        neonYellow: '#ffdd00',
                        accentRed: '#e63946',
                        cream: '#fdfbf7',
                        textDark: '#1a202c'
                      }
                    },
                    fontFamily: {
                      vintageTitle: ['"Bebas Neue"', '"M PLUS Rounded 1c"', 'sans-serif'],
                      body: ['"Inter"', '"M PLUS Rounded 1c"', 'sans-serif']
                    }
                  }
                }
              }
            `,
          }}
        ></script>

        {/* FontAwesome Icons */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />

        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700;900&family=M+PLUS+Rounded+1c:wght@500;800;900&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="min-h-screen pb-12 antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
