// Premade "survival guide" decks — instant, zero-Claude-call vocabulary sets
// for common situations, replacing the old AI fast-path. Deliberately static
// (same reasoning as lib/calibrationWords.js): a survival kit should be a
// consistent, free, instantly-available answer, not a per-tap generation.
// Pitched at A0–A1 (true beginner) since that's the level someone reaching
// for a "just get me through this" list actually needs.
//
// Word shape matches WORD_FIELDS_SPEC in lib/wordGeneration.js (word,
// translation, part_of_speech, example, example_translation) so these drop
// straight into POST /api/decks like any generated batch. `tier` is always
// "essential" — there's no "personal" tier for a premade situational deck.
// Vocabulary is kept dialect-neutral (no vosotros, no country-locked slang)
// since a static list can't apply the per-user dialectGuidance() the AI
// generators use.

function essential(word, translation, part_of_speech, example, example_translation) {
  return { word, translation, part_of_speech, example, example_translation, tier: 'essential' }
}

export const SURVIVAL_GUIDES = [
  {
    id: 'airport',
    title: 'Airport & Travel',
    emoji: '✈️',
    tagline: 'Check-in, security, and finding your gate',
    words: [
      essential('el aeropuerto', 'the airport', 'noun', 'El aeropuerto está muy lleno hoy.', 'The airport is very crowded today.'),
      essential('el vuelo', 'the flight', 'noun', 'Nuestro vuelo sale a las nueve.', 'Our flight leaves at nine.'),
      essential('la maleta', 'the suitcase', 'noun', 'Mi maleta es la azul.', 'My suitcase is the blue one.'),
      essential('el pasaporte', 'the passport', 'noun', 'Necesito mi pasaporte para entrar.', 'I need my passport to get in.'),
      essential('la puerta', 'the gate', 'noun', '¿En qué puerta embarcamos?', 'Which gate do we board at?'),
      essential('el asiento', 'the seat', 'noun', 'Mi asiento está junto a la ventana.', 'My seat is next to the window.'),
      essential('retrasado', 'delayed', 'adjective', 'El vuelo está retrasado una hora.', 'The flight is delayed an hour.'),
      essential('abordar', 'to board', 'verb', 'Vamos a abordar en diez minutos.', 'We are going to board in ten minutes.'),
      essential('perder', 'to miss (a flight)', 'verb', 'No quiero perder mi vuelo.', "I don't want to miss my flight."),
      essential('la aduana', 'customs', 'noun', 'Pasamos por la aduana sin problema.', 'We went through customs with no problem.'),
      essential('el boleto', 'the ticket', 'noun', '¿Dónde está mi boleto?', 'Where is my ticket?'),
      essential('¿Dónde está...?', 'Where is...?', 'phrase', '¿Dónde está la puerta doce?', 'Where is gate twelve?'),
    ],
  },
  {
    id: 'restaurant',
    title: 'Restaurant & Food',
    emoji: '🍽️',
    tagline: 'Ordering, paying, and dietary needs',
    words: [
      essential('el menú', 'the menu', 'noun', '¿Nos trae el menú, por favor?', 'Could you bring us the menu, please?'),
      essential('la cuenta', 'the bill / check', 'noun', 'La cuenta, por favor.', 'The check, please.'),
      essential('pedir', 'to order', 'verb', '¿Ya sabes qué vas a pedir?', 'Do you know what you are going to order yet?'),
      essential('la propina', 'the tip', 'noun', '¿Está incluida la propina?', 'Is the tip included?'),
      essential('delicioso', 'delicious', 'adjective', 'Esta sopa está deliciosa.', 'This soup is delicious.'),
      essential('la mesa', 'the table', 'noun', 'Una mesa para dos, por favor.', 'A table for two, please.'),
      essential('el agua', 'water', 'noun', 'Un agua sin gas, por favor.', 'A still water, please.'),
      essential('vegetariano', 'vegetarian', 'adjective', 'Soy vegetariano, ¿qué me recomienda?', 'I am vegetarian, what do you recommend?'),
      essential('alérgico', 'allergic', 'adjective', 'Soy alérgico a los frutos secos.', 'I am allergic to nuts.'),
      essential('recomendar', 'to recommend', 'verb', '¿Qué plato recomienda usted?', 'Which dish do you recommend?'),
      essential('para llevar', 'to go / takeaway', 'phrase', 'Es para llevar, gracias.', "It's to go, thanks."),
      essential('¿Qué me recomienda?', 'What do you recommend?', 'phrase', '¿Qué me recomienda de postre?', 'What do you recommend for dessert?'),
    ],
  },
  {
    id: 'hotel',
    title: 'Hotel & Lodging',
    emoji: '🏨',
    tagline: 'Check-in, room requests, and amenities',
    words: [
      essential('la habitación', 'the room', 'noun', 'Reservé una habitación doble.', 'I booked a double room.'),
      essential('la llave', 'the key', 'noun', 'Perdí la llave de mi habitación.', 'I lost my room key.'),
      essential('la reserva', 'the reservation', 'noun', 'Tengo una reserva a nombre de García.', 'I have a reservation under the name García.'),
      essential('el equipaje', 'the luggage', 'noun', '¿Puede guardar mi equipaje?', 'Can you keep my luggage?'),
      essential('la toalla', 'the towel', 'noun', 'Necesito más toallas, por favor.', 'I need more towels, please.'),
      essential('el desayuno', 'breakfast', 'noun', '¿A qué hora es el desayuno?', 'What time is breakfast?'),
      essential('la recepción', 'the front desk', 'noun', 'Pregunte en recepción.', 'Ask at the front desk.'),
      essential('disponible', 'available', 'adjective', '¿Hay habitaciones disponibles?', 'Are there rooms available?'),
      essential('quedarse', 'to stay', 'verb', 'Vamos a quedarnos tres noches.', 'We are going to stay three nights.'),
      essential('la contraseña', 'the (wifi) password', 'noun', '¿Cuál es la contraseña del wifi?', 'What is the wifi password?'),
      essential('registrarse', 'to check in', 'verb', 'Quiero registrarme, por favor.', 'I would like to check in, please.'),
      essential('¿A qué hora es...?', 'What time is...?', 'phrase', '¿A qué hora es el desayuno?', 'What time is breakfast?'),
    ],
  },
  {
    id: 'emergencies',
    title: 'Emergencies & Medical',
    emoji: '🚑',
    tagline: 'Getting help fast when it matters',
    words: [
      essential('la ayuda', 'help', 'noun', '¡Necesito ayuda, por favor!', 'I need help, please!'),
      essential('el hospital', 'the hospital', 'noun', 'El hospital más cercano está aquí.', 'The nearest hospital is here.'),
      essential('la farmacia', 'the pharmacy', 'noun', '¿Hay una farmacia cerca?', 'Is there a pharmacy nearby?'),
      essential('doler', 'to hurt', 'verb', 'Me duele mucho la cabeza.', 'My head hurts a lot.'),
      essential('la fiebre', 'the fever', 'noun', 'Tengo fiebre desde ayer.', 'I have had a fever since yesterday.'),
      essential('el dolor', 'the pain', 'noun', 'Tengo un dolor en el pecho.', 'I have a pain in my chest.'),
      essential('la ambulancia', 'the ambulance', 'noun', 'Llame a una ambulancia, por favor.', 'Call an ambulance, please.'),
      essential('urgente', 'urgent', 'adjective', 'Es urgente, necesito un médico.', 'It is urgent, I need a doctor.'),
      essential('el médico', 'the doctor', 'noun', 'Quiero ver a un médico.', 'I would like to see a doctor.'),
      essential('la receta', 'the prescription', 'noun', 'El médico me dio una receta.', 'The doctor gave me a prescription.'),
      essential('perdido', 'lost', 'adjective', 'Estoy perdido, ¿me puede ayudar?', 'I am lost, can you help me?'),
      essential('Necesito un médico', 'I need a doctor', 'phrase', 'Por favor, necesito un médico ahora.', 'Please, I need a doctor now.'),
    ],
  },
  {
    id: 'wedding',
    title: 'Wedding',
    emoji: '💍',
    tagline: 'Celebrating a wedding in Spanish',
    words: [
      essential('la boda', 'the wedding', 'noun', 'La boda es el sábado.', 'The wedding is on Saturday.'),
      essential('los novios', 'the bride and groom', 'noun', 'Aquí vienen los novios.', 'Here come the bride and groom.'),
      essential('¡Felicidades!', 'Congratulations!', 'interjection', '¡Felicidades a los dos!', 'Congratulations to you both!'),
      essential('el brindis', 'the toast', 'noun', 'Vamos a hacer un brindis.', "Let's make a toast."),
      essential('bailar', 'to dance', 'verb', '¿Quieres bailar en la boda?', 'Do you want to dance at the wedding?'),
      essential('el vestido', 'the dress', 'noun', 'El vestido de la novia es blanco.', "The bride's dress is white."),
      essential('el anillo', 'the ring', 'noun', 'El anillo es precioso.', 'The ring is beautiful.'),
      essential('la ceremonia', 'the ceremony', 'noun', 'La ceremonia empieza a las cinco.', 'The ceremony starts at five.'),
      essential('la luna de miel', 'the honeymoon', 'noun', 'Van a Italia de luna de miel.', 'They are going to Italy for their honeymoon.'),
      essential('invitado', 'guest', 'noun', 'Somos cien invitados.', 'We are a hundred guests.'),
      essential('casarse', 'to get married', 'verb', 'Se casan en junio.', 'They are getting married in June.'),
      essential('¡Que vivan los novios!', 'Long live the bride and groom!', 'phrase', 'Todos gritaron: ¡Que vivan los novios!', 'Everyone shouted: long live the bride and groom!'),
    ],
  },
  {
    id: 'cities',
    title: 'Cities',
    emoji: '🏙️',
    tagline: 'Getting around and finding your way',
    words: [
      essential('la calle', 'the street', 'noun', 'Vivo en esta calle.', 'I live on this street.'),
      essential('la plaza', 'the square', 'noun', 'Nos vemos en la plaza.', "See you at the square."),
      essential('el metro', 'the subway', 'noun', 'Tomamos el metro hasta el centro.', 'We take the subway to downtown.'),
      essential('la parada', 'the stop', 'noun', 'La parada de autobús está allí.', 'The bus stop is over there.'),
      essential('a la izquierda', 'to the left', 'phrase', 'Gire a la izquierda en la esquina.', 'Turn left at the corner.'),
      essential('a la derecha', 'to the right', 'phrase', 'Gire a la derecha después del banco.', 'Turn right after the bank.'),
      essential('seguir derecho', 'to go straight', 'phrase', 'Siga derecho dos cuadras más.', 'Go straight two more blocks.'),
      essential('el mapa', 'the map', 'noun', '¿Me puede mostrar en el mapa?', 'Can you show me on the map?'),
      essential('cerca', 'near', 'adverb', 'El museo está cerca de aquí.', 'The museum is near here.'),
      essential('lejos', 'far', 'adverb', 'La playa está un poco lejos.', 'The beach is a bit far.'),
      essential('perdido', 'lost', 'adjective', 'Creo que estamos perdidos.', 'I think we are lost.'),
      essential('¿Cómo llego a...?', 'How do I get to...?', 'phrase', '¿Cómo llego a la estación?', 'How do I get to the station?'),
    ],
  },
  {
    id: 'camino',
    title: 'Camino de Santiago',
    emoji: '🐚',
    tagline: 'Words for walking the pilgrim trail',
    words: [
      essential('el camino', 'the way / path', 'noun', 'Empezamos el camino mañana.', 'We start the way tomorrow.'),
      essential('la mochila', 'the backpack', 'noun', 'Mi mochila pesa mucho.', 'My backpack is very heavy.'),
      essential('el albergue', 'the pilgrim hostel', 'noun', 'Dormimos en un albergue barato.', 'We sleep in a cheap pilgrim hostel.'),
      essential('la credencial', "the pilgrim's passport", 'noun', 'Sellan la credencial en cada pueblo.', "They stamp the pilgrim's passport in every town."),
      essential('la etapa', 'the stage (day of the route)', 'noun', 'Mañana es una etapa larga.', 'Tomorrow is a long stage.'),
      essential('la ampolla', 'the blister', 'noun', 'Tengo una ampolla en el pie.', 'I have a blister on my foot.'),
      essential('descansar', 'to rest', 'verb', 'Necesitamos descansar un rato.', 'We need to rest a while.'),
      essential('caminar', 'to walk', 'verb', 'Caminamos veinte kilómetros hoy.', 'We walked twenty kilometers today.'),
      essential('el peregrino', 'the pilgrim', 'noun', 'Cada peregrino lleva una concha.', 'Every pilgrim carries a shell.'),
      essential('la flecha amarilla', 'the yellow arrow', 'noun', 'Sigue la flecha amarilla.', 'Follow the yellow arrow.'),
      essential('la concha', 'the scallop shell', 'noun', 'La concha es el símbolo del camino.', "The scallop shell is the Camino's symbol."),
      essential('¡Buen camino!', 'Have a good walk!', 'phrase', 'Los otros peregrinos dicen: ¡Buen camino!', 'The other pilgrims say: have a good walk!'),
    ],
  },
]

export function findSurvivalGuide(id) {
  return SURVIVAL_GUIDES.find((g) => g.id === id) || null
}
