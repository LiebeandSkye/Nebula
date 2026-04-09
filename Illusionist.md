New Role: Illusionist
Icon: import { IoIosInfinite } from "react-icons/io";

Description: Shapeshifts as other players and have the ability to infect one gnosia.

Add a new role called Illusionist into the Nebula game. He is sided with gnosia and has the ability to infect one player as gnosia at the start of the game, there will be a modal provided only to illusionist, illusionist can then select one player to infect OR click on select Random button. Other people who are NOT illusionist will be seeing the modal as (Illusionist is manifesting...) with all purple neon lights.

Example: If illusionist role is turned on then:
1. At the lobby, there is an input on how many gnosia there should be, lets say I input 2 gnosia
2. If illusionist role is turned on --> 1 of the 2 gnosia will become the illusionist.
3. The selected illusionist will be able to infect 1 player to become a gnosia role, therefore there will be 3 gnosia in total. Therefore when the game started, it will display, there are 3 gnosia among us.
4. Illusionist is apart of gnosia team, so they will have access to gnosia channel and also able to kill and do everything that gnosia does. (Can vote kill and everything just like gnosia)
5. If scanned by Engineer, it will be treated as (Gnosia), doesnt reveal they are illusionist and if inspected by doctor, it will be treated as Gnosia as well not showing the illusionist role.

To sum up the logic, if the input is 2 gnosia then 1 of them is illusionist --> Illusionist infect choose 1 player to infect, or random button --> 3 gnosia in total.
if the input is 3 gnosia then 1 of them is illusionist --> Illusionist infect choose 1 player to infect, or random button --> 4 gnosia in total.


SPECIAL ABILITY THAT CAN BE USED WHENEVER PUBLIC CHAT IS OPENED WITH NO COOLDOWN:
Within the chatpanel, above the input (where players click in order to input words for chatting), above that input, there will be a small component that attached above it.
Use justify-between:
1. the current Profile and username of players within the lobby.
2. The switch button


Default: that special ability will have your profile picture and username by default, however you can switch to any players within the current lobby by clicking the switch button. When clicking the switch button, the component panel will slide up, with search where illusionist can search players within the lobby OR scrolldown to switch to any player that illusionist wish. after switching, the player card still stay the same, however that component above the input will change to the username and profile of that player they wish to switch to. After that is activated, illusionist can then input words and send the message. However the sent message will be from the profile and username that the illusionist switched to.

The illusionist can switch anytime seeminglessly, make the UI/UX extremely user-friendly and can switch very fast and easily, making the game more challenging.
