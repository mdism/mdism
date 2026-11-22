"""
A simple web page for the voice assistant: press record, ask a question, hear the answer.

Run:  python app.py     then open http://127.0.0.1:7860 in your browser
"""
import gradio as gr

from voice_assistant import VoiceAssistant

assistant = VoiceAssistant()  # loads the models once at start-up


def handle(audio_path):
    if not audio_path:
        return "", "Please record or upload a question first.", None
    result = assistant.run(audio_path=audio_path)
    return result["transcript"], result["answer"], result["audio"]


demo = gr.Interface(
    fn=handle,
    inputs=gr.Audio(sources=["microphone", "upload"], type="filepath", label="Ask your question"),
    outputs=[gr.Textbox(label="What I heard"), gr.Textbox(label="Answer"),
             gr.Audio(label="Spoken answer", autoplay=True)],
    title="Cleanroom Gowning Voice Assistant (demo)",
    description="Ask about the synthetic gowning guide, for example: "
                "'What order do I put the gown on?' Runs fully on this computer.",
)

if __name__ == "__main__":
    demo.launch()
