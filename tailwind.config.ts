import type { Config } from 'tailwindcss';

export default {
    content: [
        './src/**/*.{html,js,svelte,ts}',
        './node_modules/svelte-5-ui-lib/**/*.{html,js,svelte,ts}',
        './node_modules/flowbite-svelte-icons/**/*.{html,js,svelte,ts}'
    ],
    darkMode: 'selector',
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#E0F2FE',  // Light Sky (pale blue)
                    100: '#BAE6FD', // Ocean Ash (soft blue-gray)
                    200: '#A1D9FB', // Interpolated lighter blue
                    300: '#7CCCF9', // Interpolated mid-tone blue
                    400: '#47BBF4', // Interpolated vibrant blue
                    500: '#0EA5E9', // Aqua Blue (vibrant tech blue)
                    600: '#0A85C2', // Interpolated darker blue
                    700: '#07689B', // Interpolated deep teal-blue
                    800: '#075985', // Deep Sea (dark teal)
                    900: '#053F60'  // Interpolated darkest teal
                },
                secondary: {
                    50: '#F7FAFD',  // Very light gray-blue (near white)
                    100: '#EDF5FB', // Light gray-blue
                    200: '#DCEBF7', // Soft gray-blue
                    300: '#C5DFF3', // Mid-tone gray-blue
                    400: '#A6CCE8', // Slightly deeper gray-blue
                    500: '#80B5DA', // Muted blue
                    600: '#6399C5', // Darker muted blue
                    700: '#4A7EA8', // Deep muted blue
                    800: '#366385', // Darker teal-gray
                    900: '#2A4F6B'  // Darkest teal-gray
                }
            }
        }
    }
} satisfies Config;