class GeoPortGame {
    constructor() {
        this.map = null;
        this.money = 0;
        this.turnCount = 0;
        this.level = 1;
        this.gameState = 'IDLE'; // IDLE, SHOP_SELECTED, ORDER_SELECTED, MOVING
        
        // Oyun verileri
        this.shopLocation = null;
        this.targetLocation = null;
        this.routes = [];
        this.vehicleMarker = null;
        this.targetMarker = null;
        this.routeLayers = []; // Rota polyline'larını saklamak için
        this.selectedOrderId = null;
        this.selectedOrder = null;
        this.progressLayer = null; // İlerleme vurgulama için
        
        // Ses sistemi
        this.audioContext = null;
        this.soundEnabled = true;
        this.initAudio();
        
        // Seviye Konfigürasyonları
        this.levels = {
            1: { name: "Bisiklet", color: "#f1c40f", speed: 20, zoom: 16, range: 0.01, icon: "🚲" }, // Mahalle (Ankara Yenimahalle)
            2: { name: "Motosiklet", color: "#e67e22", speed: 50, zoom: 14, range: 0.05, icon: "🏍️" }, // Şehir
            3: { name: "Kamyon", color: "#3498db", speed: 80, zoom: 10, range: 0.5, icon: "🚚" },   // Şehirlerarası
            4: { name: "Uçak", color: "#9b59b6", speed: 500, zoom: 4, range: 10, icon: "✈️" }       // Uluslararası
        };
        
        // Seçili rota için
        this.selectedRouteIndex = null;

        // Harita hazır olduğunda başlat
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initMap();
                this.updateUI();
                this.generateShops();
            });
        } else {
            this.initMap();
            this.updateUI();
            this.generateShops();
        }
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            // AudioContext suspended durumda olabilir, resume et
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            // Arka plan müziği kaldırıldı - rahatsız edici dip ses yok
        } catch (e) {
            console.log('Audio context oluşturulamadı:', e);
            this.soundEnabled = false;
        }
    }

    // Gelişmiş ses efekti oluştur (ADSR envelope ile)
    playSound(frequency, duration, type = 'sine', volume = 0.3, attack = 0.01, decay = 0.05, sustain = 0.7, release = 0.1) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        try {
            // AudioContext suspended ise resume et
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = type;
            const now = this.audioContext.currentTime;
            oscillator.frequency.setValueAtTime(frequency, now);
            
            const totalDuration = Math.min(duration, attack + decay + release);
            const sustainLevel = volume * sustain;
            
            // ADSR Envelope (Attack, Decay, Sustain, Release)
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(volume, now + attack);
            gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attack + decay);
            gainNode.gain.setValueAtTime(sustainLevel, now + totalDuration - release);
            gainNode.gain.linearRampToValueAtTime(0, now + totalDuration);
            
            oscillator.start(now);
            oscillator.stop(now + totalDuration);
        } catch (e) {
            console.log('Ses çalınamadı:', e);
        }
    }

    // İyileştirilmiş ses efektleri - Daha hoş ve profesyonel
    playClickSound() {
        // Yumuşak, kısa tıklama sesi
        this.playSound(1200, 0.05, 'sine', 0.12, 0.005, 0.01, 0.5, 0.03);
    }

    playSelectSound() {
        // Yumuşak yükselen ton (daha hoş)
        this.playSound(600, 0.12, 'sine', 0.18, 0.01, 0.02, 0.6, 0.08);
        setTimeout(() => this.playSound(800, 0.1, 'sine', 0.2, 0.01, 0.02, 0.6, 0.07), 60);
    }

    playSuccessSound() {
        // Başarı melodisi - Daha yumuşak major akor
        const notes = [523.25, 659.25, 783.99]; // C, E, G
        notes.forEach((freq, i) => {
            setTimeout(() => this.playSound(freq, 0.2, 'sine', 0.25, 0.01, 0.03, 0.7, 0.15), i * 100);
        });
        setTimeout(() => this.playSound(1046.50, 0.25, 'sine', 0.3, 0.01, 0.03, 0.7, 0.18), 300); // C (oktav üstü)
    }

    playErrorSound() {
        // Hata sesi - Daha yumuşak, düşen ton
        this.playSound(400, 0.15, 'triangle', 0.25, 0.01, 0.02, 0.5, 0.12);
        setTimeout(() => this.playSound(300, 0.18, 'triangle', 0.28, 0.01, 0.02, 0.5, 0.15), 80);
    }

    playDeliverySound() {
        // Teslimat başlangıç sesi - Daha hoş, yumuşak motor sesi
        this.playSound(200, 0.2, 'triangle', 0.15, 0.02, 0.05, 0.6, 0.13);
        setTimeout(() => this.playSound(250, 0.15, 'triangle', 0.18, 0.01, 0.03, 0.6, 0.11), 100);
        setTimeout(() => this.playSound(300, 0.12, 'triangle', 0.15, 0.01, 0.02, 0.6, 0.09), 200);
    }

    playLevelUpSound() {
        // Seviye atlama - Daha hoş, yükselen arpej
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C, E, G, C, E
        notes.forEach((freq, i) => {
            setTimeout(() => this.playSound(freq, 0.18, 'sine', 0.3, 0.01, 0.02, 0.7, 0.15), i * 80);
        });
    }
    
    playRouteSelectSound() {
        // Rota seçim sesi - Yumuşak, hoş ping
        this.playSound(900, 0.08, 'sine', 0.15, 0.005, 0.01, 0.6, 0.065);
        setTimeout(() => this.playSound(1100, 0.06, 'sine', 0.12, 0.005, 0.01, 0.6, 0.045), 40);
    }
    
    playConfirmSound() {
        // Onay sesi - Yumuşak, hoş beep
        this.playSound(700, 0.1, 'sine', 0.2, 0.01, 0.02, 0.6, 0.07);
        setTimeout(() => this.playSound(900, 0.12, 'sine', 0.22, 0.01, 0.02, 0.6, 0.09), 60);
    }

    initMap() {
        // Başlangıç: Ankara Yenimahalle (Kullanıcının ilgi alanı bağlamında)
        this.map = L.map('map').setView([39.965, 32.780], 16);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);
    }

    // Rastgele Mağazalar Oluştur (Level'a göre)
    generateShops() {
        if (!this.map) {
            console.error('Harita bulunamadı, mağazalar oluşturulamıyor');
            return;
        }
        
        console.log('Yeni mağazalar oluşturuluyor...');
        
        // Eski marker ve polyline layerları temizle (tileLayer'ı koru)
        this.map.eachLayer((layer) => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.GeoJSON) {
                // Vehicle ve target marker'ları koru (zaten temizlendi ama emin olmak için)
                if (layer !== this.vehicleMarker && layer !== this.targetMarker) {
                    this.map.removeLayer(layer);
                }
            }
        });

        const center = this.map.getCenter();
        const range = this.levels[this.level].range;

        console.log(`Mağaza oluşturma: center=${center.lat},${center.lng}, range=${range}, level=${this.level}`);

        // 5 adet rastgele mağaza oluştur
        for (let i = 0; i < 5; i++) {
            try {
                const point = turf.randomPoint(1, {bbox: [
                    center.lng - range, center.lat - range,
                    center.lng + range, center.lat + range
                ]}).features[0];

                const lat = point.geometry.coordinates[1];
                const lng = point.geometry.coordinates[0];

                const marker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: 'custom-pin',
                        html: `<div style="background-color:${this.levels[this.level].color}; width:20px; height:20px; border-radius:50%; border:2px solid white; box-shadow:0 0 10px ${this.levels[this.level].color}"></div>`
                    })
                }).addTo(this.map);

                marker.on('click', () => {
                    console.log(`Mağaza seçildi: ${lat}, ${lng}`);
                    this.onShopSelect([lat, lng], marker);
                });
                
                console.log(`Mağaza ${i + 1} oluşturuldu: ${lat}, ${lng}`);
            } catch (err) {
                console.error(`Mağaza ${i + 1} oluşturulamadı:`, err);
            }
        }
        
        console.log('Mağazalar oluşturuldu, oyun hazır');
    }

    onShopSelect(coords, marker) {
        if (this.gameState !== 'IDLE') return;

        this.shopLocation = coords;
        this.gameState = 'SHOP_SELECTED';
        
        // Ses efekti
        this.playSelectSound();
        
        // Mağazayı vurgula
        this.map.flyTo(coords, this.levels[this.level].zoom);
        
        // Sipariş Modalını Aç
        document.getElementById('instruction-text').innerText = "Mağaza seçildi. Sipariş bekleniyor...";
        document.getElementById('order-modal').classList.remove('hidden');
    }

    selectOrder(orderId) {
        this.playClickSound();
        document.getElementById('order-modal').classList.add('hidden');
        this.gameState = 'ORDER_SELECTED';
        this.selectedOrderId = orderId;
        
        // Sipariş özelliklerini rastgele belirle (gizli)
        const orderTypes = [
            { name: 'Kısa Mesafe', multiplier: 0.8, risk: 0.3 },
            { name: 'Standart', multiplier: 1.0, risk: 0.5 },
            { name: 'Hacimli Yük', multiplier: 1.5, risk: 0.7 },
            { name: 'Acil', multiplier: 1.2, risk: 0.6 },
            { name: 'Değerli', multiplier: 2.0, risk: 0.4 }
        ];
        this.selectedOrder = orderTypes[Math.floor(Math.random() * orderTypes.length)];
        
        this.generateTargetAndRoutes();
    }

    generateTargetAndRoutes() {
        const range = this.levels[this.level].range * 1.5;
        const center = { lng: this.shopLocation[1], lat: this.shopLocation[0] };

        // Hedef Nokta Oluştur (Turf.js)
        const targetPoint = turf.randomPoint(1, {bbox: [
            center.lng - range, center.lat - range,
            center.lng + range, center.lat + range
        ]}).features[0];
        
        const targetCoords = [targetPoint.geometry.coordinates[1], targetPoint.geometry.coordinates[0]];
        this.targetLocation = targetCoords;

        // Hedef Markeri
        if (this.targetMarker) {
            this.map.removeLayer(this.targetMarker);
        }
        this.targetMarker = L.marker(targetCoords, {
            icon: L.divIcon({
                className: 'target-pin',
                html: `<div style="background-color:#e74c3c; width:25px; height:25px; border-radius:50%; border:2px solid white; animation: pulse 1s infinite;">🏠</div>`
            })
        }).addTo(this.map);

        // Haritayı iki noktayı kapsayacak şekilde sığdır
        const bounds = L.latLngBounds([this.shopLocation, targetCoords]);
        this.map.fitBounds(bounds, {padding: [100, 100]});

        // Async fonksiyonu await ile çağır
        this.calculateRoutes().catch(error => {
            console.error('Rota hesaplama hatası:', error);
            // Hata durumunda fallback kullan
            this.calculateFallbackRoutes(
                this.shopLocation[1], 
                this.shopLocation[0], 
                this.targetLocation[1], 
                this.targetLocation[0]
            );
        });
    }

    async calculateRoutes() {
        const fromLng = this.shopLocation[1];
        const fromLat = this.shopLocation[0];
        const toLng = this.targetLocation[1];
        const toLat = this.targetLocation[0];

        // Loading göster
        document.getElementById('loading-routes').classList.remove('hidden');
        document.getElementById('route-options').innerHTML = '';

        try {
            // Timeout ile API çağrısı (5 saniye)
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
            );

            // OSRM API ile gerçek rotalar hesapla
            const routesPromise = this.fetchRealRoutes(fromLng, fromLat, toLng, toLat);
            const routes = await Promise.race([routesPromise, timeoutPromise]);
            
            if (routes && routes.length > 0) {
                this.routes = routes;
                document.getElementById('loading-routes').classList.add('hidden');
                this.showRouteSelection();
            } else {
                throw new Error('Rota bulunamadı');
            }
        } catch (error) {
            console.log('Rota hesaplama hatası, fallback kullanılıyor:', error);
            // Fallback: Basit rotalar
            document.getElementById('loading-routes').classList.add('hidden');
            this.calculateFallbackRoutes(fromLng, fromLat, toLng, toLat);
        }
    }

    async fetchRealRoutes(fromLng, fromLat, toLng, toLat) {
        // OSRM public instance kullan (API key gerektirmez)
        const baseUrl = 'https://router.project-osrm.org';
        
        try {
            // İlk olarak alternatif rotaları al
            const url = `${baseUrl}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?alternatives=true&geometries=geojson&overview=full&steps=false`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 saniye timeout

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                // Benzersiz rotalar oluştur (mesafe farkına göre)
                const uniqueRoutes = [];
                const seenDistances = new Set();
                
                data.routes.forEach((route, index) => {
                    const geometry = route.geometry;
                    const distance = route.distance / 1000; // metre'den km'ye
                    const duration = route.duration / 60; // saniye'den dakika'ya
                    
                    // Mesafeyi yuvarla ve benzersizlik kontrolü yap
                    const roundedDist = Math.round(distance * 100) / 100;
                    
                    // Eğer benzer mesafede rota varsa atla (fark en az %5 olmalı)
                    let isUnique = true;
                    for (const seenDist of seenDistances) {
                        const diff = Math.abs(roundedDist - seenDist) / seenDist;
                        if (diff < 0.05) {
                            isUnique = false;
                            break;
                        }
                    }
                    
                    if (isUnique && uniqueRoutes.length < 3) {
                        seenDistances.add(roundedDist);
                        
                        const names = ['Kestirme', 'Standart Rota', 'Güvenli Çevre Yolu'];
                        const risks = [0.8, 0.4, 0.1];
                        
                        // Her rotaya rastgele olay ekle
                        const event = this.generateRouteEvent(uniqueRoutes.length, distance);

                        uniqueRoutes.push({
                            id: uniqueRoutes.length + 1,
                            name: names[uniqueRoutes.length] || `Rota ${uniqueRoutes.length + 1}`,
                            geo: geometry,
                            dist: distance,
                            duration: duration,
                            risk: risks[uniqueRoutes.length] || 0.5,
                            event: event
                        });
                    }
                });
                
                // Minimum 3 rota garantisi - eğer azsa alternatifler ekle
                if (uniqueRoutes.length < 3) {
                    const moreRoutes = await this.ensureMinimumRoutes(fromLng, fromLat, toLng, toLat, uniqueRoutes);
                    return moreRoutes;
                }

                return uniqueRoutes;
            } else {
                throw new Error('Rota bulunamadı');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('OSRM API timeout');
            } else {
                console.log('OSRM API hatası:', error);
            }
            // CORS veya diğer hatalar için alternatif yöntem dene
            try {
                const altRoutes = await this.fetchAlternativeRoutes(fromLng, fromLat, toLng, toLat, []);
                if (altRoutes && altRoutes.length > 0) {
                    return altRoutes;
                }
            } catch (altError) {
                console.log('Alternatif rotalar da alınamadı:', altError);
            }
            // Hiçbir rota alınamazsa boş döndür, fallback kullanılsın
            return [];
        }
    }

    async fetchAlternativeRoutes(fromLng, fromLat, toLng, toLat, existingRoutes) {
        const baseUrl = 'https://router.project-osrm.org';
        
        // Orta nokta hesapla
        const midLng = (fromLng + toLng) / 2;
        const midLat = (fromLat + toLat) / 2;

        // Mesafeye göre waypoint offset hesapla
        const distance = turf.distance([fromLng, fromLat], [toLng, toLat], {units: 'kilometers'});
        const offset = Math.min(distance * 0.1, 0.02); // Mesafenin %10'u veya max 0.02 derece

        // Farklı waypoint'lerle rotalar oluştur
        const waypoints = [
            null, // Direkt rota
            [midLng + offset, midLat + offset], // Sağ üst
            [midLng - offset, midLat - offset]  // Sol alt
        ];

        const routePromises = waypoints.map(async (waypoint, index) => {
            try {
                let url;
                if (waypoint) {
                    url = `${baseUrl}/route/v1/driving/${fromLng},${fromLat};${waypoint[0]},${waypoint[1]};${toLng},${toLat}?geometries=geojson&overview=full&steps=false`;
                } else {
                    url = `${baseUrl}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&overview=full&steps=false`;
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 saniye timeout

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                    const routeData = data.routes[0];
                    const geometry = routeData.geometry;
                    const distance = routeData.distance / 1000;
                    const duration = routeData.duration / 60;

                    const names = ['Kestirme', 'Standart Rota', 'Güvenli Çevre Yolu'];
                    const risks = [0.8, 0.4, 0.1];
                    
                    // Olay ekle
                    const event = this.generateRouteEvent(index, distance);

                    return {
                        id: index + 1,
                        name: names[index] || `Rota ${index + 1}`,
                        geo: geometry,
                        dist: distance,
                        duration: duration,
                        risk: risks[index] || 0.5,
                        event: event
                    };
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.log(`Alternatif rota ${index + 1} alınamadı:`, err);
                }
            }
            return null;
        });

        const routes = await Promise.all(routePromises);
        const validRoutes = routes.filter(r => r !== null);

        // Mevcut rotalarla birleştir ve benzersiz yap (mesafe farkına göre)
        const allRoutes = [...existingRoutes];
        const seenDistances = new Set();
        
        // Mevcut rotaların mesafelerini kaydet
        existingRoutes.forEach(route => {
            const roundedDist = Math.round(route.dist * 100) / 100;
            seenDistances.add(roundedDist);
        });
        
        validRoutes.forEach(route => {
            const roundedDist = Math.round(route.dist * 100) / 100;
            
            // Benzersizlik kontrolü (fark en az %5 olmalı)
            let isUnique = true;
            for (const seenDist of seenDistances) {
                const diff = Math.abs(roundedDist - seenDist) / Math.max(seenDist, roundedDist);
                if (diff < 0.05) {
                    isUnique = false;
                    break;
                }
            }
            
            if (isUnique && allRoutes.length < 3) {
                seenDistances.add(roundedDist);
                allRoutes.push(route);
            }
        });

        return allRoutes.slice(0, 3);
    }

    generateRouteEvent(routeIndex, distance) {
        const events = [
            {
                type: 'traffic',
                name: 'Yoğun Trafik',
                icon: '🚦',
                description: 'Yoğun trafik nedeniyle gecikme riski',
                effect: { timeMultiplier: 1.3, costPenalty: 0.1 },
                probability: 0.4
            },
            {
                type: 'accident',
                name: 'Kaza',
                icon: '⚠️',
                description: 'Yolda kaza var, alternatif yol gerekebilir',
                effect: { timeMultiplier: 2.0, costPenalty: 0.3 },
                probability: 0.15
            },
            {
                type: 'bonus',
                name: 'Hızlı Yol',
                icon: '⚡',
                description: 'Trafik açık, hızlı ilerleme',
                effect: { timeMultiplier: 0.7, costBonus: 0.2 },
                probability: 0.25
            },
            {
                type: 'toll',
                name: 'Ücretli Yol',
                icon: '💰',
                description: 'Ücretli yol, ekstra maliyet',
                effect: { costPenalty: 0.15 },
                probability: 0.3
            },
            {
                type: 'weather',
                name: 'Kötü Hava',
                icon: '🌧️',
                description: 'Kötü hava koşulları, yavaş ilerleme',
                effect: { timeMultiplier: 1.5, costPenalty: 0.1 },
                probability: 0.2
            },
            {
                type: 'police',
                name: 'Kontrol Noktası',
                icon: '🚔',
                description: 'Polis kontrolü, gecikme',
                effect: { timeMultiplier: 1.2, costPenalty: 0.05 },
                probability: 0.1
            },
            {
                type: 'shortcut',
                name: 'Kestirme Yol',
                icon: '🛤️',
                description: 'Bilinmeyen kestirme yol bulundu',
                effect: { timeMultiplier: 0.8, costBonus: 0.1 },
                probability: 0.2
            },
            {
                type: 'breakdown',
                name: 'Araç Arızası',
                icon: '🔧',
                description: 'Araç arızası, tamir gerekebilir',
                effect: { timeMultiplier: 1.8, costPenalty: 0.25 },
                probability: 0.1
            }
        ];
        
        // Rota riskine göre olay seç
        const routeRisks = [0.8, 0.4, 0.1];
        const risk = routeRisks[routeIndex] || 0.5;
        
        // Riskli rotalarda daha fazla olumsuz olay
        const filteredEvents = events.filter(e => {
            if (risk > 0.6) {
                // Riskli rotalar için olumsuz olaylar daha olası
                return e.type !== 'bonus' && e.type !== 'shortcut';
            } else if (risk < 0.3) {
                // Güvenli rotalar için olumlu olaylar daha olası
                return e.type === 'bonus' || e.type === 'shortcut' || e.type === 'toll';
            }
            return true;
        });
        
        // Rastgele olay seç
        const selectedEvent = filteredEvents[Math.floor(Math.random() * filteredEvents.length)];
        
        // Olayın gerçekleşme olasılığını kontrol et
        if (Math.random() < selectedEvent.probability) {
            return selectedEvent;
        }
        
        // Olay gerçekleşmezse null döndür
        return null;
    }
    
    async ensureMinimumRoutes(fromLng, fromLat, toLng, toLat, existingRoutes) {
        // Minimum 3 rota garantisi için alternatif rotalar ekle
        const needed = 3 - existingRoutes.length;
        
        if (needed > 0) {
            const altRoutes = await this.fetchAlternativeRoutes(fromLng, fromLat, toLng, toLat, existingRoutes);
            
            // Mevcut rotaların mesafelerini kaydet
            const seenDistances = new Set();
            existingRoutes.forEach(route => {
                const roundedDist = Math.round(route.dist * 100) / 100;
                seenDistances.add(roundedDist);
            });
            
            // Benzersiz rotaları ekle
            const allRoutes = [...existingRoutes];
            altRoutes.forEach(route => {
                const roundedDist = Math.round(route.dist * 100) / 100;
                
                // Benzersizlik kontrolü
                let isUnique = true;
                for (const seenDist of seenDistances) {
                    const diff = Math.abs(roundedDist - seenDist) / Math.max(seenDist, roundedDist);
                    if (diff < 0.05) {
                        isUnique = false;
                        break;
                    }
                }
                
                if (isUnique && allRoutes.length < 3) {
                    seenDistances.add(roundedDist);
                    if (!route.event) {
                        route.event = this.generateRouteEvent(allRoutes.length, route.dist);
                    }
                    allRoutes.push(route);
                }
            });
            
            return allRoutes.slice(0, 3);
        }
        
        return existingRoutes;
    }

    calculateFallbackRoutes(fromLng, fromLat, toLng, toLat) {
        // API başarısız olursa fallback: Basit rotalar
        const from = turf.point([fromLng, fromLat]);
        const to = turf.point([toLng, toLat]);
        
        const directLine = turf.lineString([[fromLng, fromLat], [toLng, toLat]]);
        const midPoint = turf.midpoint(from, to);
        const curved = turf.bezierSpline(
            turf.lineString([[fromLng, fromLat], [midPoint.geometry.coordinates[0] + 0.002, midPoint.geometry.coordinates[1] + 0.002], [toLng, toLat]])
        );
        
        // Üçüncü rota için farklı bir eğri
        const curved2 = turf.bezierSpline(
            turf.lineString([[fromLng, fromLat], [midPoint.geometry.coordinates[0] - 0.002, midPoint.geometry.coordinates[1] - 0.002], [toLng, toLat]])
        );

        // GeoJSON formatına çevir (OSRM formatı gibi)
        const directGeo = {
            type: 'LineString',
            coordinates: directLine.geometry.coordinates
        };
        
        const curvedGeo = {
            type: 'LineString',
            coordinates: curved.geometry.coordinates
        };
        
        const curvedGeo2 = {
            type: 'LineString',
            coordinates: curved2.geometry.coordinates
        };

        const dist1 = turf.length(directLine, {units: 'kilometers'});
        const dist2 = turf.length(curved, {units: 'kilometers'});
        const dist3 = turf.length(curved2, {units: 'kilometers'});

        this.routes = [
            { 
                id: 1, 
                name: "Kestirme", 
                geo: directGeo, 
                dist: dist1, 
                duration: null, 
                risk: 0.8,
                event: this.generateRouteEvent(0, dist1)
            },
            { 
                id: 2, 
                name: "Standart Rota", 
                geo: curvedGeo, 
                dist: dist2, 
                duration: null, 
                risk: 0.4,
                event: this.generateRouteEvent(1, dist2)
            },
            { 
                id: 3, 
                name: "Alternatif", 
                geo: curvedGeo2, 
                dist: dist3, 
                duration: null, 
                risk: 0.1,
                event: this.generateRouteEvent(2, dist3)
            }
        ];

        this.showRouteSelection();
    }

    showRouteSelection() {
        console.log('showRouteSelection çağrıldı, rotalar:', this.routes);
        
        const panel = document.getElementById('route-options');
        if (!panel) {
            console.error('route-options panel bulunamadı');
            return;
        }
        
        panel.innerHTML = '';
        
        // Önceki rotaları temizle
        if (this.routeLayers && this.routeLayers.length > 0) {
            this.routeLayers.forEach(layer => {
                if (this.map && this.map.hasLayer(layer)) {
                    this.map.removeLayer(layer);
                }
            });
        }
        this.routeLayers = [];
        
        // Rotalar yoksa hata göster
        if (!this.routes || this.routes.length === 0) {
            console.error('Rotalar bulunamadı!');
            panel.innerHTML = '<p style="color: #e74c3c; padding: 20px;">Rota bulunamadı. Lütfen tekrar deneyin.</p>';
            const routePanel = document.getElementById('route-panel');
            if (routePanel) {
                routePanel.classList.remove('hidden');
            }
            return;
        }
        
        console.log(`${this.routes.length} rota gösteriliyor`);
        
        this.selectedRouteIndex = null;
        
        // Onay butonunu gizle
        const confirmBtn = document.getElementById('confirm-route-btn');
        if (confirmBtn) {
            confirmBtn.classList.add('hidden');
        }
        
        this.routes.forEach((route, index) => {
            try {
                // GeoJSON formatını kontrol et
                let geoData = route.geo;
                if (geoData.type && geoData.coordinates) {
                    // Zaten GeoJSON formatında
                } else if (geoData.geometry) {
                    // Turf.js formatından GeoJSON'a çevir
                    geoData = geoData.geometry;
                }
                
                // Haritaya Çiz (Gri olarak)
                const poly = L.geoJSON(geoData, {
                    style: { color: 'gray', dashArray: '5, 5', weight: 3, opacity: 0.6 }
                }).addTo(this.map);
                this.routeLayers.push(poly);
                
                // Polyline'a referans ekle
                poly.routeIndex = index;

                // Buton Ekle - Modern tasarım
                const btn = document.createElement('div');
                btn.className = 'btn-route';
                btn.dataset.routeIndex = index;
                
                const durationText = route.duration ? `${Math.round(route.duration)} dk` : 'Hesaplanıyor...';
                const riskColor = route.risk > 0.6 ? '#e74c3c' : route.risk > 0.3 ? '#f39c12' : '#2ecc71';
                const riskText = route.risk > 0.6 ? 'Yüksek Risk' : route.risk > 0.3 ? 'Orta Risk' : 'Düşük Risk';
                
                // Olay bilgisi - daha modern tasarım
                let eventHTML = '';
                if (route.event) {
                    const eventColor = route.event.type === 'bonus' || route.event.type === 'shortcut' ? '#2ecc71' : 
                                     route.event.type === 'toll' ? '#f39c12' : '#e74c3c';
                    eventHTML = `
                        <div class="route-event">
                            <div class="event-icon">${route.event.icon}</div>
                            <div class="event-content">
                                <div class="event-name">${route.event.name}</div>
                                <div class="event-desc">${route.event.description}</div>
                            </div>
                        </div>
                    `;
                }
                
                btn.innerHTML = `
                    <div class="route-header">
                        <div class="route-name-section">
                            <div class="route-number">${index + 1}</div>
                            <div class="route-title">
                                <strong>${route.name}</strong>
                                <span class="route-risk" style="color: ${riskColor}">${riskText}</span>
                            </div>
                        </div>
                    </div>
                    <div class="route-stats">
                        <div class="route-stat">
                            <span class="stat-icon">📏</span>
                            <span class="stat-value">${route.dist.toFixed(2)} km</span>
                        </div>
                        <div class="route-stat">
                            <span class="stat-icon">⏱️</span>
                            <span class="stat-value">${durationText}</span>
                        </div>
                    </div>
                    ${eventHTML}
                `;
                btn.onclick = () => {
                    console.log(`Rota ${index} seçildi (henüz onaylanmadı)`);
                    this.selectRoute(index, poly);
                };
                panel.appendChild(btn);
            } catch (err) {
                console.error(`Rota ${index} çizilemedi:`, err, route);
            }
        });

        const routePanel = document.getElementById('route-panel');
        if (routePanel) {
            routePanel.classList.remove('hidden');
        }
        
        const instructionText = document.getElementById('instruction-text');
        if (instructionText) {
            instructionText.innerText = "Bir rota seçin.";
        }
        
        console.log('Rota seçim paneli gösterildi');
    }

    selectRoute(routeIndex, polyLayer) {
        this.playRouteSelectSound();
        
        // Önceki seçimi temizle
        if (this.selectedRouteIndex !== null && this.routeLayers[this.selectedRouteIndex]) {
            this.routeLayers[this.selectedRouteIndex].setStyle({ 
                color: 'gray', 
                dashArray: '5, 5', 
                weight: 3, 
                opacity: 0.6 
            });
        }
        
        // Buton stillerini sıfırla
        document.querySelectorAll('.btn-route').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Yeni seçimi işaretle
        this.selectedRouteIndex = routeIndex;
        polyLayer.setStyle({ 
            color: this.levels[this.level].color, 
            dashArray: null, 
            weight: 5, 
            opacity: 1 
        });
        
        // Butonu vurgula
        const btn = document.querySelector(`.btn-route[data-route-index="${routeIndex}"]`);
        if (btn) {
            btn.classList.add('selected');
        }
        
        // Onay butonunu göster
        const confirmBtn = document.getElementById('confirm-route-btn');
        if (confirmBtn) {
            confirmBtn.classList.remove('hidden');
        }
    }
    
    confirmRoute() {
        if (this.selectedRouteIndex === null) {
            console.error('Rota seçilmedi');
            return;
        }
        
        this.playConfirmSound();
        const selectedRoute = this.routes[this.selectedRouteIndex];
        const polyLayer = this.routeLayers[this.selectedRouteIndex];
        
        this.startDelivery(this.selectedRouteIndex, polyLayer);
    }
    
    startDelivery(routeIndex, polyLayer) {
        document.getElementById('route-panel').classList.add('hidden');
        this.gameState = 'MOVING';
        
        const selectedRoute = this.routes[routeIndex];
        
        // Teslimat başlangıç sesi
        this.playDeliverySound();
        
        // Progress bar'ı göster
        const deliveryProgress = document.getElementById('delivery-progress');
        const instructionText = document.getElementById('instruction-text');
        if (deliveryProgress) {
            deliveryProgress.classList.remove('hidden');
        }
        if (instructionText) {
            instructionText.innerText = 'Teslimat devam ediyor...';
        }
        
        // Seçilen rotayı renklendir ve animasyonlu yap
        if (polyLayer) {
            polyLayer.setStyle({ 
                color: this.levels[this.level].color, 
                dashArray: null, 
                weight: 6, 
                opacity: 1 
            });
            
            // Rota üzerinde animasyon efekti
            this.animateRoute(polyLayer);
        }

        // GeoJSON formatını kontrol et ve coordinates'ı al
        let coordinates;
        if (selectedRoute.geo.geometry && selectedRoute.geo.geometry.coordinates) {
            coordinates = selectedRoute.geo.geometry.coordinates;
        } else if (selectedRoute.geo.coordinates) {
            coordinates = selectedRoute.geo.coordinates;
        } else {
            console.error('Rota koordinatları bulunamadı:', selectedRoute);
            coordinates = [[this.shopLocation[1], this.shopLocation[0]], [this.targetLocation[1], this.targetLocation[0]]];
        }
        
        // Gelişmiş animasyon sistemi (hızlandırılmış)
        let progress = 0;
        // Animasyon süresini hızlandır: rota süresinin 1/8'i kadar (8x hızlı)
        // Minimum 2 saniye, maksimum 6 saniye
        const baseDuration = selectedRoute.duration ? selectedRoute.duration * 60 * 1000 : 5000;
        const totalDuration = Math.max(2000, Math.min(6000, baseDuration * 0.125)); // 8x hızlı
        const updateInterval = 30; // 30ms (daha akıcı)
        const progressStep = updateInterval / totalDuration;
        
        // İlk konumu ayarla
        const vehicleIcon = this.levels[this.level].icon;
        const startLat = coordinates[0][1];
        const startLng = coordinates[0][0];
        
        this.vehicleMarker = L.marker([startLat, startLng], {
            icon: L.divIcon({ 
                html: `<div class="vehicle-marker">${vehicleIcon}</div>`, 
                className: 'vehicle-icon-container', 
                iconSize: [50, 50],
                iconAnchor: [25, 25]
            })
        }).addTo(this.map);
        
        // Haritayı araçla birlikte takip et
        this.map.setView([startLat, startLng], this.map.getZoom());
        
        // Animasyon döngüsü
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            progress = Math.min(elapsed / totalDuration, 1);
            
            // Progress bar güncelle
            const progressFill = document.getElementById('progress-fill');
            const progressText = document.getElementById('progress-text');
            const deliveryStatus = document.getElementById('delivery-status');
            
            if (progressFill) {
                progressFill.style.width = `${progress * 100}%`;
            }
            if (progressText) {
                progressText.textContent = `${Math.round(progress * 100)}%`;
            }
            
            // Durum mesajları
            if (deliveryStatus) {
                if (progress < 0.3) {
                    deliveryStatus.textContent = 'Yola çıkılıyor...';
                } else if (progress < 0.6) {
                    deliveryStatus.textContent = 'Yolda...';
                } else if (progress < 0.9) {
                    deliveryStatus.textContent = 'Hedefe yaklaşılıyor...';
                } else {
                    deliveryStatus.textContent = 'Teslimat yapılıyor...';
                }
            }
            
            if (progress >= 1) {
                clearInterval(interval);
                if (deliveryProgress) {
                    deliveryProgress.classList.add('hidden');
                }
                this.endTurn(selectedRoute);
            } else {
                // Yumuşak interpolasyon ile konum hesapla
                const targetIdx = progress * (coordinates.length - 1);
                const currentIdx = Math.floor(targetIdx);
                const nextIdx = Math.min(currentIdx + 1, coordinates.length - 1);
                const t = targetIdx - currentIdx;
                
                // Lineer interpolasyon
                const current = coordinates[currentIdx];
                const next = coordinates[nextIdx];
                const lat = current[1] + (next[1] - current[1]) * t;
                const lng = current[0] + (next[0] - current[0]) * t;
                
                // Araç pozisyonunu güncelle
                this.vehicleMarker.setLatLng([lat, lng]);
                
                // Haritayı araçla birlikte kaydır (smooth pan)
                if (progress > 0.1 && progress < 0.9) {
                    this.map.panTo([lat, lng], { animate: false });
                }
                
                // Rotanın ilerleyen kısmını vurgula
                this.highlightRouteProgress(polyLayer, coordinates, progress);
            }
        }, updateInterval);
    }
    
    animateRoute(polyLayer) {
        // Rota üzerinde pulse efekti
        let pulseOpacity = 1;
        const pulseInterval = setInterval(() => {
            if (this.gameState !== 'MOVING') {
                clearInterval(pulseInterval);
                return;
            }
            pulseOpacity = pulseOpacity === 1 ? 0.6 : 1;
            polyLayer.setStyle({ opacity: pulseOpacity });
        }, 500);
    }
    
    highlightRouteProgress(polyLayer, coordinates, progress) {
        // İlerleyen kısmı vurgula - performans için sadece belirli aralıklarla
        if (Math.floor(progress * 100) % 10 === 0) {
            const completedCoords = coordinates.slice(0, Math.floor(progress * coordinates.length));
            if (completedCoords.length > 1) {
                // Tamamlanan kısmı daha parlak göster
                const completedGeo = {
                    type: 'LineString',
                    coordinates: completedCoords
                };
                
                // Eğer önceki highlight layer varsa kaldır
                if (this.progressLayer) {
                    this.map.removeLayer(this.progressLayer);
                }
                
                // Yeni highlight layer oluştur
                this.progressLayer = L.geoJSON(completedGeo, {
                    style: {
                        color: this.levels[this.level].color,
                        weight: 8,
                        opacity: 0.8
                    }
                }).addTo(this.map);
            }
        }
    }

    endTurn(route) {
        this.gameState = 'RESULT';
        
        // Temel kazanç hesapla
        let baseProfit = route.dist * 100;
        
        // Sipariş çarpanını uygula
        if (this.selectedOrder) {
            baseProfit *= this.selectedOrder.multiplier;
        }
        
        // Rota olayını uygula
        let eventMessages = [];
        let finalProfit = baseProfit;
        
        if (route.event) {
            const event = route.event;
            
            // Zaman çarpanı (süre uzarsa ekstra maliyet)
            if (event.effect.timeMultiplier) {
                const timePenalty = (event.effect.timeMultiplier - 1) * baseProfit * 0.1;
                finalProfit -= timePenalty;
                eventMessages.push(`${event.icon} ${event.name}: Süre ${event.effect.timeMultiplier.toFixed(1)}x`);
            }
            
            // Maliyet cezası
            if (event.effect.costPenalty) {
                const penalty = baseProfit * event.effect.costPenalty;
                finalProfit -= penalty;
                eventMessages.push(`💰 -₺${Math.floor(penalty)} ceza`);
            }
            
            // Bonus
            if (event.effect.costBonus) {
                const bonus = baseProfit * event.effect.costBonus;
                finalProfit += bonus;
                eventMessages.push(`✨ +₺${Math.floor(bonus)} bonus`);
            }
        }
        
        // Risk faktörü
        const riskFactor = Math.random();
        let status = "Başarılı";
        
        if (riskFactor < route.risk) {
            const riskPenalty = finalProfit * 0.3;
            finalProfit -= riskPenalty;
            status = "Gecikme / Hasar!";
            eventMessages.push(`⚠️ Risk: -₺${Math.floor(riskPenalty)}`);
            this.playErrorSound();
        } else {
            this.playSuccessSound();
        }
        
        // Minimum kazanç garantisi
        finalProfit = Math.max(finalProfit, baseProfit * 0.3);

        this.money += Math.floor(finalProfit);
        this.turnCount++;
        
        // Sonuç mesajını güncelle
        route.finalProfit = Math.floor(finalProfit);
        route.eventMessages = eventMessages;

        // Level Atlamayı Kontrol Et
        if (this.turnCount % 3 === 0 && this.level < 4) {
            this.level++;
            this.playLevelUpSound();
            alert(`Tebrikler! Seviye Atladınız: ${this.levels[this.level].name}`);
        }

        this.showResultModal(route, finalProfit, status);
        this.updateUI();
    }

    showResultModal(route, profit, status) {
        const modal = document.getElementById('result-modal');
        modal.classList.remove('hidden');
        
        // Görev Durumu panelini gizle (modal üzerinde kalmasın)
        const instructionPanel = document.getElementById('instruction-panel');
        if (instructionPanel) {
            instructionPanel.classList.add('hidden');
        }
        
        // Sipariş bilgisi
        let orderInfo = '';
        if (this.selectedOrder) {
            orderInfo = `<div style="margin-bottom: 10px; padding: 10px; background: rgba(52, 152, 219, 0.1); border-radius: 8px;">
                <strong>Sipariş Tipi:</strong> ${this.selectedOrder.name}<br>
                <small>Çarpan: ${this.selectedOrder.multiplier}x</small>
            </div>`;
        }
        
        // Olay mesajları
        let eventInfo = '';
        if (route.eventMessages && route.eventMessages.length > 0) {
            eventInfo = `<div style="margin-top: 10px; padding: 10px; background: rgba(255, 193, 7, 0.1); border-radius: 8px;">
                <strong>Rota Olayları:</strong><br>
                ${route.eventMessages.map(msg => `<div style="margin-top: 5px;">${msg}</div>`).join('')}
            </div>`;
        }
        
        document.getElementById('profit-text').innerHTML = `
            ${orderInfo}
            Durum: <strong>${status}</strong><br>
            Mesafe: ${route.dist.toFixed(2)} km<br>
            Kazanç: <span style="color:${profit > 0 ? '#2ecc71' : 'red'}">₺${Math.floor(profit)}</span>
            ${eventInfo}
        `;

        // Chart.js Grafiği
        const ctx = document.getElementById('performanceChart').getContext('2d');
        
        // Var olan chart'ı yok et
        if (window.myChart) window.myChart.destroy();

        window.myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Kestirme', 'Seçilen', 'Güvenli'],
                datasets: [{
                    label: 'Mesafe (km)',
                    data: [this.routes[0].dist, route.dist, this.routes[2].dist],
                    backgroundColor: [
                        'rgba(231, 76, 60, 0.5)',
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(46, 204, 113, 0.5)'
                    ],
                    borderColor: '#ecf0f1',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: 'white' } }
                },
                scales: {
                    y: { ticks: { color: 'white' } },
                    x: { ticks: { color: 'white' } }
                }
            }
        });
    }

    nextTurn() {
        console.log('nextTurn çağrıldı');
        
        // Tüm modalları ve panelleri temizle
        const resultModal = document.getElementById('result-modal');
        if (resultModal) {
            resultModal.classList.add('hidden');
        }
        
        const routePanel = document.getElementById('route-panel');
        if (routePanel) {
            routePanel.classList.add('hidden');
        }
        
        const orderModal = document.getElementById('order-modal');
        if (orderModal) {
            orderModal.classList.add('hidden');
        }
        
        // Vehicle marker'ı temizle
        if (this.vehicleMarker) {
            this.map.removeLayer(this.vehicleMarker);
            this.vehicleMarker = null;
        }
        
        // Tüm rotaları temizle
        if (this.routeLayers && this.routeLayers.length > 0) {
            this.routeLayers.forEach(layer => {
                if (this.map && this.map.hasLayer(layer)) {
                    this.map.removeLayer(layer);
                }
            });
        }
        this.routeLayers = [];
        
        // Progress layer'ı temizle
        if (this.progressLayer) {
            this.map.removeLayer(this.progressLayer);
            this.progressLayer = null;
        }
        
        // Hedef marker'ı temizle
        if (this.targetMarker) {
            this.map.removeLayer(this.targetMarker);
            this.targetMarker = null;
        }
        
        // Tüm marker'ları temizle (mağazalar hariç - generateShops yeniden oluşturacak)
        this.map.eachLayer((layer) => {
            if (layer instanceof L.Marker && layer !== this.vehicleMarker && layer !== this.targetMarker) {
                // Mağaza marker'larını da temizle, generateShops yeniden oluşturacak
                this.map.removeLayer(layer);
            }
            if (layer instanceof L.Polyline || layer instanceof L.GeoJSON) {
                this.map.removeLayer(layer);
            }
        });
        
        // Oyun durumunu sıfırla
        this.gameState = 'IDLE';
        this.shopLocation = null;
        this.targetLocation = null;
        this.routes = [];
        this.selectedRouteIndex = null;
        
        // Onay butonunu gizle
        const confirmBtn = document.getElementById('confirm-route-btn');
        if (confirmBtn) {
            confirmBtn.classList.add('hidden');
        }
        
        // UI güncelle
        const instructionText = document.getElementById('instruction-text');
        if (instructionText) {
            instructionText.innerText = "Yeni bir mağaza seçin.";
        }
        
        // Progress bar'ı gizle
        const deliveryProgress = document.getElementById('delivery-progress');
        if (deliveryProgress) {
            deliveryProgress.classList.add('hidden');
        }
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        
        // Instruction panel'i göster
        const instructionPanel = document.getElementById('instruction-panel');
        if (instructionPanel) {
            instructionPanel.classList.remove('hidden');
        }
        
        // Yeni dükkanlar oluştur
        this.generateShops();
        
        // Haritayı merkeze al (Eğer level atladıysa yeni zoom ile)
        const center = this.map.getCenter();
        this.map.setView(center, this.levels[this.level].zoom);
        
        console.log('nextTurn tamamlandı, yeni görev hazır');
    }

    updateUI() {
        document.getElementById('money-display').innerText = `₺${this.money}`;
        document.getElementById('delivery-count').innerText = this.turnCount;
        document.getElementById('level-indicator').innerText = `LVL ${this.level}: ${this.levels[this.level].name}`;
        document.getElementById('level-indicator').style.backgroundColor = this.levels[this.level].color;
    }
}

// Oyunu Başlat (sadece global değişken olarak tanımla, constructor'da başlatma)
let game = null;

// Ses açma/kapama fonksiyonu
function toggleSound() {
    if (game) {
        game.soundEnabled = !game.soundEnabled;
        const btn = document.getElementById('sound-toggle');
        if (game.soundEnabled) {
            btn.textContent = '🔊';
            btn.title = 'Ses Açık';
        } else {
            btn.textContent = '🔇';
            btn.title = 'Ses Kapalı';
        }
    }
}

// startGame fonksiyonu - HTML'den çağrılıyor
function startGame() {
    // Başlangıç sesi - daha hoş, yumuşak
    if (game && game.soundEnabled) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            const now = audioContext.currentTime;
            oscillator.frequency.setValueAtTime(500, now);
            oscillator.frequency.exponentialRampToValueAtTime(1000, now + 0.25);
            
            // Yumuşak fade in/out
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.2);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.25);
            
            oscillator.start(now);
            oscillator.stop(now + 0.25);
        } catch (e) {
            console.log('Başlangıç sesi çalınamadı:', e);
        }
    }
    
    // Intro screen'i gizle
    document.getElementById('intro-screen').style.display = 'none';
    // UI layer'ı göster
    document.getElementById('ui-layer').classList.remove('hidden');
    document.getElementById('footer-bar').classList.remove('hidden');
    // Oyunu başlat
    if (!game) {
        game = new GeoPortGame();
    }
}