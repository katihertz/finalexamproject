const OpenAi = require("openai");
const client = new OpenAi({
    apiKey: process.env.OPENAI_API_KEY
});

async function get_response() {
    const response = await client.responses.create({
        model: "gpt-4.1-mini",
        instructions: "Respond in just one word.",
        input: "Categorize the following prompt as one of the seven deadly sins:'I wish for money'."
    });

    console.log(response.output_text);
}

get_response()

