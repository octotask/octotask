export function importView({
  name,
  GH_HOST,
  WEBHOOK_PROXY_URL = "",
}: {
  name?: string;
  GH_HOST: string;
  WEBHOOK_PROXY_URL?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en" class="height-full" data-color-mode="auto" data-light-theme="light" data-dark-theme="dark">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Import ${name || "Your App"} | built with Octotask</title>
    <link rel="icon" href="/octotask/static/octotask-head.png">
    <link rel="stylesheet" href="/octotask/static/primer.css">
</head>

<body class="bg-gray-light">
    <div class="d-flex flex-column flex-justify-center flex-items-center text-center height-full py-6">
        <a href="/octotask"><img src="/octotask/static/robot.svg" alt="Octotask Logo" width="100" class="mb-6"></a>
        <div class="box-shadow rounded-2 border p-6 bg-white">
            <h2>Use existing Github App</h2>
            <br>

            <h3>Step 1:</h3>
            <p class="d-block mt-2">
                Replace your app's Webhook URL with <br>
                <b>${WEBHOOK_PROXY_URL}</b>
            </p>
            <a class="d-block mt-2" href="${GH_HOST}/settings/apps" target="__blank" rel="noreferrer">
                You can do it here
            </a>

            <br>
            <h3>Step 2:</h3>
            <p class="mt-2">Fill out this form</p>
            <form onsubmit="return onSubmit(event) || false">
                <label class="d-block mt-2" for="appId">App Id</label>
                <input class="form-control width-full" type="text" required="true" id="appId" name="appId"><br>

                <label class="d-block mt-3" for="whs">Webhook secret (required!)</label>
                <input class="form-control width-full" type="password" required="true" id="whs" name="whs"><br>

                <label class="d-block mt-3" for="pem">Private Key</label>
                <input class="form-control width-full m-2" type="file" accept=".pem" required="true" id="pem"
                    name="pem">
                <br>

                <button class="btn btn-outline m-2" type="submit">Submit</button>
            </form>
        </div>

        <div class="mt-4">
            <h4 class="alt-h4 text-gray-light">Need help?</h4>
            <div class="d-flex flex-justify-center mt-2">
                <a href="https://octotask.github.io/docs/" class="btn btn-outline mr-2">Documentation</a>
                <a href="https://github.com/octotask/octotask/discussions" class="btn btn-outline">Discuss on GitHub</a>
            </div>
        </div>
    </div>
    <script>
        function onSubmit(e) {
            e.preventDefault();

            const idEl = document.getElementById('appId');
            const appId = idEl.value;


            const secretEl = document.getElementById('whs');
            const webhook_secret = secretEl.value;

            const fileEl = document.getElementById('pem');
            const file = fileEl.files[0];

            file.text().then((text) => fetch('', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ appId, pem: text, webhook_secret })
            })).then((r) => {
                if (r.ok) {
                    location.replace('/octotask/success');
                }
            }).catch((e) => alert(e));
            return false;
        }
    </script>
</body>

</html>`;
}
