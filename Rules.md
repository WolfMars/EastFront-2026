# Rules
## Movement
A unit moves using its movement points

## Combat
Different types of combat
Assault - to move into a hex occupied by enemy - change or no change of hex ownership, enter or no enter the hex
Skirmish - moving into Zone of control - stop/stand, move on, retreat

## Units
All units have a movement value, a combat value, and a name
Infantry
Motorised
Mechanised
Armor

## Air force
Air force is a force-multiplier that is not visible on the map.
Its effect on combat will be calculated back-end.
Air force can be strengthened with reinforcement points.
A player will allocate air force on the map, choosing one or several hexes acting as center-of-mass for the air force. 

## Supply
The hex with an HQ in it is the center of the supply.
A unit within range of the HQ is in supply.
A unit within double range of the HQ is in "half-supply".
A unit that can trace back to an HQ at any range is in "nominal supply".
A unit not able to trace back to an HQ is out of supply.
Effects of supply is calculated back-end, with indicator on the unit.

## Intelligence
The more intelligence, the more info on (own and) enemy units
Intelligence is bought with reinforcement points

## The map

## Fog of war
A player will see enemy units that are adjacent or near own units
This is partly dependent on the allocation of points to Intelligence

## A turn
Receive reinforcements
HQ-phase (upload, deploy, organise)
Deploy air-forces (choose one or more hexes)
Movement
Repeat:
    Skirmish phase
    Movement
Until no more skirmish
Assault
Result of assaults
Calculate supply
Buy reinforcements (every second turn)