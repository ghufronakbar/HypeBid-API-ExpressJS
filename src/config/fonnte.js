import { FONNTE_API_KEY } from "../constant/fonnte.js";

const fonnte = {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': FONNTE_API_KEY,
    },
    countryCode: '62'
}

export default fonnte