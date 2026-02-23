import { useState } from "react";

const App: React.FC = () => {
  const [formData, setFormData] = useState("");

  const handleChange = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    console.log(name, value);
    setFormData(() => value);
    try {
      const response = await fetch("https://localhost:8000/api/form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chat: formData, enter: false }),
        mode: "cors",
      });
      if (response.ok) {
        console.log("Data submitted successfully");
        // フォームの送信後に必要な処理を追加する
      } else {
        console.error("Failed to submit data");
      }
    } catch (error) {
      console.error("Error submitting data:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    console.log("formData", formData);
    e.preventDefault();
    try {
      const response = await fetch("https://localhost:8000/api/form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chat: formData, enter: true }),
        mode: "cors",
      });
      if (response.ok) {
        console.log("Data submitted successfully");
        // フォームの送信後に必要な処理を追加する
      } else {
        console.error("Failed to submit data");
      }
    } catch (error) {
      console.error("Error submitting data:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="chat">Chat:</label>
        <input
          type="text"
          id="chat"
          name="chat"
          value={formData}
          onChange={handleChange}
          required
        />
      </div>
      <button type="submit">Submit</button>
    </form>
  );
};

export default App;
