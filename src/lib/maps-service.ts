// Mappe e Calcolo Distanze (Azzurro Real Service)

export interface Coordinates {
    lat: number;
    lon: number;
    address: string;
}

// Coordinate Sede Master (Molteno)
export const MASTER_BASE: Coordinates = {
    lat: 45.7670,
    lon: 9.3090,
    address: "Molteno, LC"
};

/**
 * Geocodifica un indirizzo usando Nominatim (OSM)
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
            headers: { 'User-Agent': 'AzzurroRideApp/1.0' }
        });
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
                address: data[0].display_name
            };
        }
        return null;
    } catch (e) {
        console.error("Geocoding Error:", e);
        return null;
    }
}

/**
 * Calcola la distanza in KM tra due punti (Haversine formula)
 * Aggiunge un coefficiente di correzione per simulare il percorso stradale (ca. 1.3x)
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raggio terra in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return parseFloat((d * 1.32).toFixed(2)); // Moltiplicatore stradale stimato
}

/**
 * Calcola i KM Operativi Reali (Sede -> A -> B -> Sede)
 */
export function calculateOperationalKm(start: Coordinates, end: Coordinates, base: Coordinates = MASTER_BASE): number {
    const d1 = calculateDistanceKm(base.lat, base.lon, start.lat, start.lon); // Sede -> Partenza
    const d2 = calculateDistanceKm(start.lat, start.lon, end.lat, end.lon);   // Partenza -> Arrivo
    const d3 = calculateDistanceKm(end.lat, end.lon, base.lat, base.lon);     // Arrivo -> Sede
    return parseFloat((d1 + d2 + d3).toFixed(2));
}

/**
 * Calcola il prezzo basato sulle tariffe reali
 */
export function calculateRidePrice(km: number, settings: any, options: { isNight?: boolean, isAirport?: boolean, passengers?: number, bags?: number, isWeekend?: boolean, isUrgent?: boolean, isEvent?: boolean }): number {
    const basePrice = parseFloat(settings.tariffa_base_fissa || 8);
    const kmRate = options.isNight ? parseFloat(settings.tariffa_km_notturna || 0.4) : parseFloat(settings.tariffa_km_diurna || 0.25);
    
    let total = basePrice + (km * kmRate);
    
    // Supplementi
    if (options.isAirport) {
        const minAero = parseFloat(settings.tariffa_minima_aeroporto || 30);
        if (total < minAero) total = minAero;
        
        if (options.passengers && options.passengers > 1) {
            total += (options.passengers - 1) * parseFloat(settings.extra_pax_aero || 15);
        }
    } else {
        if (options.passengers && options.passengers > 1) {
            const perc = parseFloat(settings.extra_pax_std_perc || 15);
            total += total * (perc / 100) * (options.passengers - 1);
        }
    }
    
    if (options.bags) total += options.bags * parseFloat(settings.supplemento_bagaglio || 3);
    if (options.isWeekend) total += parseFloat(settings.supplemento_weekend || 3);
    if (options.isUrgent) total += parseFloat(settings.supplemento_urgenza || 5);
    if (options.isEvent) total += total * (parseFloat(settings.supplemento_eventi_perc || 25) / 100);
    
    return Math.ceil(total); // Arrotondiamo per eccesso all'euro
}
