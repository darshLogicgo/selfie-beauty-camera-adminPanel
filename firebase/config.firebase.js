import admin from "firebase-admin";

// Check if Firebase app already exists to avoid duplicate initialization
try {
  admin.app();
} catch (error) {
  // App doesn't exist, initialize it
  admin.initializeApp({
    credential: admin.credential.cert({
      // type: "service_account",
      // project_id: "flutterrepomodule",
      // private_key_id: "b00bb829e88bb3f9b07ac48266c7bbe42c1de1a4",
      // private_key:
      //   "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCpgmp2v2J6YbxR\nDI4cXyWnId6V5jZ2Y75qRc//Px/1XXF+iqb2rsHta5u3uVuyYrdUlLSfSrNL4nls\nGP7rbOtViSqJRkBCs7kXzklJahgXmPWtYdYmtt38BwQws0TRHaL9nmwMhYRXWt87\nR6ExmrT9Nf6VrE7yiF/xXLdSvnhDrn4Pug5Y1ftqkepN+Goz0sblyJCgv68boEuA\niZcvu9XWhwyXNFEfTTQv4DLDTYP4VHHuL1QdtixDskS0wH1NV41KOEMoDGpOuM2n\nqFygKNJVhyHWyF3HJejvJNQtE/TypS5ArIHbudMasHCttz7l5Ulq4+4IGierCKk0\nals8YgRbAgMBAAECggEAAZQ77qhAwBgZ+31M85m1TZXEr4vJ9RdfxjipQ9zwLMZ2\nkLG09XZSSyZl+HOrFYHS6GBMQHGfMvVEoUuoUEQe+xiAg2/amGR5NG4RA7SPzeR4\nYWmYZ5rrfXYJRXTeDr6ibo9jvUgfH/syOiikKUSiK/utR/Knd53qmuJ8uLIah7Lc\nCymJhCoqIItOLsWe+NkCrmnP24pNE1etalUYhoRGKX/LY1VTJwGr4HBSQDGXZ+SV\nZen4tVs3gwDmQUN5xHdSdmMBI/a/M8iT8x7lEQ90oYrk2FMl4s/66lQFEBUAN90t\nKnkvKvnJgbT9CDxyjtQlAkWvPCEEj32vQyUocuye3QKBgQDSYgB3qE26BDtpoVEM\ngNgf/Vt1ZXv/IhkkBgtkm+HvnTgQK+nBfcFfklc1KAWUJWn+5PsSCrt2SiDOprbx\n+XLpdXvkL+pQKWBDsSepe7pyE28FQKridAO8evHOcgNniSyPG2uFERmxRKPHfY9R\nwTzK0ZM+VP+dAv2+m41pnR0GjwKBgQDOQ5navuxaQySB5mTM1ZS+NmySzVV11mhv\nY6KHccKNNi6JDNpljytvF3oGZ/q9F3r+4g01kQTUflKpxgaYj5wgSLGqq9zX4RZl\nm5LcrLQdKpnw4m+U652SAwIBtFQl5QHwbrL8ThqVXRNFFYmBredAkrwIC+U1HBgE\n4GRY87wrdQKBgFFYS0346XTPRhmloizvdKGJ2N8fij4v9QCUxbr0+vsnExJNqGiE\nM0y8zLNk8iNCBCXma52iQLGQH/dHRt1w0hmqr2ifjj3Igcwqp2dEy+Zn1Tl2s5wz\nt24dK3njY6WYyH3c4EnnPsPoAluUFOJLkTHqrsAfJWaUTYBxrM/1S8/JAoGBAJZQ\njX7sRDJDXAeOb0cXHx6/asBRA0asyc7jPT6XmMBwC9m0lDQO8ggzg6nHfOLwiaHV\n+upelLaGmJdAyO3FOnIMh+1o8bghQMErbwuCkH/w297AJbDRRDN0HbJASFKVYaRm\nB+n2wUi4W6Ks31ix8yULyhvTD2Z04swq+vYYKblBAoGBALWU0C5/cgO5OA+QatWg\n1l95CVjNse1tfz/PfGQygN0mEJ6fcaLv2uSDcfdK8bYzUDrfQb2KnmgMc9qtxzLV\nCkK6qzGhx8bh9RxlB5Oh7sJ81HsV5o6muEsfqTWpmuCaOuV6Awq9Hb+P5V4uzkA3\nuL7Y2+bxKlcd36aOTsOZhuZH\n-----END PRIVATE KEY-----\n",
      // client_email:
      //   "firebase-adminsdk-fbsvc@flutterrepomodule.iam.gserviceaccount.com",
      // client_id: "111337120115631152596",
      // auth_uri: "https://accounts.google.com/o/oauth2/auth",
      // token_uri: "https://oauth2.googleapis.com/token",
      // auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      // client_x509_cert_url:
      //   "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40flutterrepomodule.iam.gserviceaccount.com",
      // universe_domain: "googleapis.com",

      type: "service_account",
      project_id: "selfie-camera-short",
      private_key_id: "fc8a3ce0f99c57ee4fc3652189931ad3abd02609",
      private_key:
        "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6OcZ4u7zzld08\nTbTkSVTstvQVhxCDk2uD7KyuVf7CMA1/NBsa8wDv/bLOxrHOtQpr1uIAnCNpTkB/\nqzqMCtuW/LO/L80lkz+hhecDJWovDsckBNlubG/UifbqItHnHJ80y2cH2p5ZBqYs\nZ7oiHV9KTmjS6waStjz/Szao4z9GDvPtFjOYbEucxdVC/n30rdYyCysq8pXBtrtS\nGpMVoYztZ88nslI+mLq2m4ntgv2+o++NkoF21Pi6K+Y6cQzxIVGZ95x5TVR59k2q\n50y2oOCECNlkD5ornoMi1vwl+R+ghhSiE86YqSnqJoAm2R0C32ITuHxYVCsuZyPQ\n2MA9+dctAgMBAAECggEAAY0trB/USSs8dp4nHafGv1oe2ncPmikGQkkcfy9UOgXw\ndtjWSPkxTs6MSNC69n/noFJf+6VRXjU6sFWa3UPR5IYicTtSuDdr1kqpTAtpwQ6c\ndh5cOWFJ5TlpBzZXDVfds7DmINifbRpzE/ehQ1t/Sb0xfmBa46oFBBN6VxndkxXV\nJSivRg5GrKtUk5EjR5l6Iq2JLUG5Hb0eO59781JDv1T/N/ZvT/c7ZeeIYKl4QaP2\n6cAFj0iAu/oJ0hym1kgtiq8PwCncIpiImC7n6v0WzU1zgmb/Cdnm9/sNATfufdro\nXvokgbCTzgAgaQHgpKNhpPPIpzSPxjxInJ4ECsS9AQKBgQD0T5RVHZCKcyNbJXvv\n7ftf58FuaTY62MOTNusU6rwMym9BFKPU9KzcfeVGk9eSEKZH4Kqqr0M9ZbmyesUV\nwSAtTrAshonSFIP4eE2W0fFhA5uJRX8il1RlKQRbpGbRjFuZjU6nBcW1EsfCHFQ+\ncmm7ZAaZxT0G2T8hlDv0QpaL4QKBgQDDIr6eXf/7y9wIOrarsBI8FA3Kc3t6G3oz\n8v7uUT4VbLPXtIIrhL43te5lBGhpSJzPMZ/1HN+OGBG2BcenCvUIsiV5sF4YOB9B\nK1U1eU/yqKFx8kEFt3turOt7zvbHJVOihQ6KHSoF6xg4WhdRqcRJsdakOH+1TpCj\nGo9cBkZUzQKBgBY/aPKXTqJM+dtC/pZKxalmIWc8jYOuWaD+T0oIVjeT962lg4XR\nAizSCh7zN55Fhd7lxqTkcOsWaGKoa2ofvB5kHAbx+Xr4A0yNKAOj+qcq/O7zNTCh\nNz4/DfaKchKDBZRmGdN74xUqMKasjb9iC97UrQUzwOruvaEBLrR/m9YBAoGBAJ4O\nmo/0W9A8g/E2fZf7egmnxLPjbnStpQJHJS8sJzl7XwCteXJ+hwThHEQ+mcQNyNYa\nwBHuXTXfURk6/UjUmz177tbugIjljItg6hfyN0u6Q2rkar6SrCwtbGBQd5s/JMtT\nMz+z98HrdybN8m13MULwBYfnK6pUBNvYO56yhm1RAoGBAIbnUzRPYKwzVm013afF\n64IrQ4NgUyPxNNZB/K0dBSvGIZN/J9ANv6dcvAMhoS9iZ0fhscM7VwnYBGfE4nuw\nLagk5Al1S3v6cfQ5h8EZyWir2DnP4lUkUnNc7xXFfN8rqs9NldeVD7yi+RlYoKZY\nvyrYiSp5kTXHWKDLcFhqqo88\n-----END PRIVATE KEY-----\n",
      client_email:
        "firebase-adminsdk-t28tr@selfie-camera-short.iam.gserviceaccount.com",
      client_id: "109873916324778050020",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url:
        "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-t28tr%40selfie-camera-short.iam.gserviceaccount.com",
      universe_domain: "googleapis.com",
    }),
  });
}

export default admin;
