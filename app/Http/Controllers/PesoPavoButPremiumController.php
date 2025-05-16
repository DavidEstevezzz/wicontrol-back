<?php

namespace App\Http\Controllers;

use App\Models\PesoPavoButPremium;
use Illuminate\Http\Request;

class PesoPavoButPremiumController extends Controller
{
    public function index()
    {
        $datos = PesoPavoButPremium::orderBy('edad')->paginate(50);
        return view('peso_pavos_butpremium.index', compact('datos'));
    }

    public function create()
    {
        return view('peso_pavos_butpremium.create');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'edad'   => 'required|integer|unique:tb_peso_pavos_butpremium,edad',
            'macho'  => 'required|integer',
            'hembra' => 'required|integer',
        ]);
        PesoPavoButPremium::create($data);
        return redirect()->route('pavos-butpremium.index')
                         ->with('success','Registro creado correctamente.');
    }

    public function show($edad)
    {
        $item = PesoPavoButPremium::findOrFail($edad);
        return view('peso_pavos_butpremium.show', compact('item'));
    }

    public function edit($edad)
    {
        $item = PesoPavoButPremium::findOrFail($edad);
        return view('peso_pavos_butpremium.edit', compact('item'));
    }

    public function update(Request $request, $edad)
    {
        $data = $request->validate([
            'macho'  => 'required|integer',
            'hembra' => 'required|integer',
        ]);
        $item = PesoPavoButPremium::findOrFail($edad);
        $item->update($data);
        return redirect()->route('pavos-butpremium.index')
                         ->with('success','Registro actualizado correctamente.');
    }

    public function destroy($edad)
    {
        $item = PesoPavoButPremium::findOrFail($edad);
        $item->delete();
        return redirect()->route('pavos-butpremium.index')
                         ->with('success','Registro eliminado correctamente.');
    }
}
