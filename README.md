# GEOPORT

> **Geography and transportation**, inspired by airport.

## Build Your Transport Empire

---

## Table of Contents

1. [About the Game](#about-the-game)
2. [Gameplay](#gameplay)
3. [Game Content](#game-content)
   - [Levels](#levels)
   - [Missions](#missions)
   - [Game Mechanics](#game-mechanics)
4. [Technical Details](#technical-details)
   - [Libraries to be Used](#libraries-to-be-used)

---

## About the Game

GeoPort is a **geographic strategy and route optimization game** where players build a courier/logistics company from scratch, starting with bicycle cargo delivery in a small neighborhood and rising to an international air cargo company.

Pick up cargo, choose the right route, deliver on time, and grow your company.

---

## Gameplay

The user interacts directly with the map throughout the game.

### Game Flow

1. **Shop Selection**: Select one of the shops visible on the map
2. **Order Selection**: Choose one of three hidden orders from the selected shop
3. **Target Identification**: After selecting an order, the target house location appears on the map
4. **Route Selection**: The user is presented with three different route options and completes the delivery by selecting one of these routes

During this process, the user performs steps such as selecting shops, choosing orders, viewing target locations, and determining routes on the map, trying to find both the shortest distance and the right strategy.

---

## Game Content

### Levels

The game features a progressive difficulty system consisting of four separate levels. Each level offers different gameplay based on the capacity of the vehicle the player can use, the width of the map, and the distance of delivery missions.

#### Level 1 – Bicycle

- Played in a small area. (Neighborhood)
- Delivery points are close to each other.
- Maximum route length is low.
- Player learns basic mechanics.

#### Level 2 – Motorcycle

- Game area expands. (Urban)
- Deliveries are made over longer distances.
- Player must be more careful about time and route selection.
- Error costs increase.

#### Level 3 – Truck

- Played in a large area. (Intercity)
- Points are quite far from each other.
- Route selection becomes more strategic.
- Risk of exceeding distance limit rises.
- Correct sequencing and route optimization become critically important.

#### Level 4 – Airplane

- Game map reaches its widest state. (International)
- Delivery points can be very far away.
- Route lengths are calculated using great-circle logic.
- Every wrong decision can lead to significant profit loss.

> With this structure, the game provides a natural increase in difficulty for players to manage their growing logistics network. Each new vehicle and each expanding map requires more complex decisions compared to the previous level.

### Missions

The game does not have a fixed number of missions; it is built on an **infinite mission cycle**. Each turn is considered a single delivery mission.

#### Mission Structure

During this mission, the player:
1. First selects a shop
2. Then chooses one of three hidden orders from this shop
3. When order selection is completed, the game offers the player three different routes for this delivery
4. The player completes the delivery by selecting one of these routes

#### Reward System

As a result of the delivery, the player can earn money based on the length of the selected route and the risk taken, or lose money due to wrong decisions.

#### Progression Mechanics

- Missions are unlimited and the player can play as many turns as desired
- Each mission can be thought of as a "game day" in the game
- The player purchases new vehicles with earnings from deliveries
- Thanks to new vehicles, the player begins to work in wider areas and more challenging levels
- With the unlocking of new vehicles, the game naturally progresses, and with the transition from bicycle to motorcycle, from motorcycle to truck, and finally to airplane, the mission structure and geographic scale expand

#### Missions Changing with Level Progression

As levels progress, the nature of missions automatically changes:
- Delivery distances increase
- Profit potential increases
- Error risks grow
- Penalty mechanics become more effective
- Route options become more complex

Thus, the game gradually transforms into a more strategic, more attention-requiring, and more comprehensive logistics simulation along with the player's development.

### Game Mechanics

The game is built on the player starting with a basic transportation vehicle and progressing by purchasing more advanced vehicles as delivery missions are completed.

#### Turn Structure

In each turn, the user:
1. Selects a shop
2. Takes one of three hidden orders from this shop
3. Chooses one of three route options presented to reach the target address

#### Progression System

- Earnings from deliveries enable opening new levels by purchasing faster vehicles
- The game progresses on a single attempt basis; the user makes only one order and one route selection per turn

#### Error and Retry Mechanics

- The user loses money in cases of wrong route selection, exceeding distance limit, or making wrong decisions
- However, the turn can be replayed
- The user has unlimited retry rights; however, each error causes economic regression

---

## Technical Details

### Libraries to be Used

#### Leaflet.js

Leaflet will be used for GeoPort's basic geographic interface.

**Use Cases:**
- Map display
- Marker addition
- Route drawing (polyline)
- Interactive navigation at different zoom levels

This library provides a lightweight and flexible structure. It enables players to make shop, house, and route selections directly on the map.

#### Turf.js

Turf.js will be used for calculating route lengths, checking distance limits, and comparing different route options.

**Use Cases:**
- Calculating the distance between two points in kilometers
- Estimating international distances using great-circle logic
- Geographic analyses

This way, it becomes possible to directly connect the selected route to reward and penalty mechanics.

#### Chart.js

Chart.js will be used to provide performance feedback to players at the end of deliveries.

**Use Cases:**
- Comparing the distance of the player's selected route with ideal/alternative routes
- Displaying profit changes over time
- Visual analysis of performance between different turns

#### Vanilla JavaScript

All workflow including game logic, state management (game state), money system, level transitions, and button/menu interactions will be managed with vanilla JavaScript.

**Advantages:**
- Works without framework dependency
- Results in a lightweight and easily distributable web-based GeoGame that works with only the HTML/CSS/JS trio.

## Design
![geoport_design](https://github.com/user-attachments/assets/36885a76-c2ca-462c-9751-e45bf6815962)

---

Yasir Eren Çelik - Geoport

